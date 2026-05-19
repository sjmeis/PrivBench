"""
Run DP-Prompt (DPPrompt from PrivFill/LLMDP.py) on the benchmark datasets.

Privacy budget: document-level epsilon = average NLTK token count of the dataset.
Each document is privatized with eps_per_token = dataset_epsilon / doc_token_count.
For short docs (fit in one flan-t5 call): pass eps_per_token directly to privatize().
For long docs (exceed 512 model tokens): split into chunks, each chunk gets
dataset_epsilon / N_chunks under basic DP composition.

Usage (on server, inside ~/dpmlm_venv):
    # Process all datasets sequentially:
    python3 ~/run_dp_prompt.py

    # Process a single dataset:
    python3 ~/run_dp_prompt.py --dataset imdb.csv

    # Process a row range (for parallel chunks), with pre-computed epsilon:
    python3 ~/run_dp_prompt.py --dataset imdb.csv --start 0 --end 333 --epsilon 223.7 --suffix _chunk0

Prerequisites:
    - PrivFill cloned at ~/PrivFill
      git clone https://github.com/sjmeis/PrivFill.git ~/PrivFill
    - Virtual environment with torch, transformers, mpmath, tqdm, nltk
      (reuse ~/dpmlm_venv: pip install mpmath tqdm)
    - flan-t5-large (~3GB) auto-downloads from HuggingFace on first run
"""

import argparse
import csv
import re
import sys
import time
from pathlib import Path
from statistics import mean

import nltk
nltk.download("punkt_tab", quiet=True)


def clean_text(text: str) -> str:
    """Strip HTML tags and normalise whitespace (fixes IMDB <br /> etc.)."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


try:
    import torch
    _has_torch = True
except ImportError:
    _has_torch = False

PRIVFILL_DIR = Path.home() / "PrivFill"
INPUT_DIR = Path.home()
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "dp_prompt"


def _patch_llmdp_file():
    """Patch LLMDP.py for transformers >=5.0 compatibility. Idempotent.

    transformers 5.x removed the 'text2text-generation' pipeline task.
    DPPrompt.__init__ always creates this pipeline, but we only use
    dp.privatize() (direct model.generate()), not dp.privatize_dp().
    Fix: wrap the pipeline creation + pad_token_id access in a try/except.
    """
    llmdp_py = PRIVFILL_DIR / "LLMDP.py"
    src = llmdp_py.read_text(encoding="utf-8")

    # Target: the original two-line block
    _OLD = (
        '        self.pipe = pipeline("text2text-generation", model=self.model, '
        'tokenizer=self.tokenizer, device=self.device, truncation=True)\n'
        '        self.pipe.tokenizer.pad_token_id = self.model.config.eos_token_id'
    )
    # Replacement: both lines wrapped in one try/except
    _NEW = (
        '        try:\n'
        '            self.pipe = pipeline("text2text-generation", model=self.model, '
        'tokenizer=self.tokenizer, device=self.device, truncation=True)\n'
        '            self.pipe.tokenizer.pad_token_id = self.model.config.eos_token_id\n'
        '        except (KeyError, Exception):\n'
        '            self.pipe = None  # patched: text2text-generation removed in transformers>=5'
    )

    if _OLD in src:
        llmdp_py.write_text(src.replace(_OLD, _NEW, 1), encoding="utf-8")
        print("  Patched LLMDP.py: wrapped pipeline() for transformers>=5 compat", flush=True)
    elif 'self.pipe = None' in src:
        print("  LLMDP.py patch already applied.", flush=True)
    else:
        print("  [WARN] LLMDP.py patch pattern not found — check PrivFill version.", flush=True)

# Cap per-document NLTK token count for epsilon calculation.
# flan-t5-large truncates input to 512 model tokens; we handle long docs via chunking.
MAX_NLTK_TOKENS = 400

# flan-t5-large was trained with 512-token sequences.
# We reserve ~15 tokens for the prompt template overhead.
MAX_MODEL_TOKENS = 512
PROMPT_OVERHEAD = 15

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]


def chunk_and_privatize(dp, text: str, doc_epsilon: float) -> str:
    """Privatize text, chunking if it exceeds flan-t5's 512-token window.

    For texts that fit in one call: use dp.privatize() with doc_epsilon.
    For longer texts: split into N chunks of ≤ (MAX_MODEL_TOKENS - PROMPT_OVERHEAD)
    subword tokens, privatize each with doc_epsilon / N (basic composition),
    and join with spaces.
    """
    usable_tokens = MAX_MODEL_TOKENS - PROMPT_OVERHEAD
    full_ids = dp.tokenizer.encode(text, add_special_tokens=False)

    if len(full_ids) <= usable_tokens:
        return dp.privatize(text, epsilon=doc_epsilon)

    # Split into chunks by subword token index
    chunks_ids = [
        full_ids[i:i + usable_tokens]
        for i in range(0, len(full_ids), usable_tokens)
    ]
    n_chunks = len(chunks_ids)
    eps_per_chunk = doc_epsilon / n_chunks  # basic composition: sum = doc_epsilon

    privatized_chunks = []
    for chunk_ids in chunks_ids:
        chunk_text = dp.tokenizer.decode(chunk_ids, skip_special_tokens=True)
        privatized_chunks.append(dp.privatize(chunk_text, epsilon=eps_per_chunk))

    return " ".join(privatized_chunks)


def process_dataset(filename: str, dp, start_row=0, end_row=None,
                    dataset_epsilon=None, suffix=""):
    input_path = INPUT_DIR / filename
    out_name = filename.replace(".csv", f"_dp_prompt{suffix}.csv")
    output_path = OUTPUT_DIR / out_name
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        all_rows = list(reader)

    # Select row range
    if end_row is None:
        end_row = len(all_rows)
    rows = all_rows[start_row:end_row]
    total = len(rows)

    # Skip if already completed
    if output_path.exists():
        with open(output_path, newline="", encoding="utf-8") as f:
            output_rows = sum(1 for _ in f) - 1
        if output_rows >= total:
            print(f"\nSkipping {out_name} (already complete: {output_rows} rows)", flush=True)
            return

    # Compute or reuse dataset-level epsilon = average NLTK token count
    if dataset_epsilon is None:
        word_counts = [len(nltk.word_tokenize(clean_text(r["text"]))) for r in all_rows]
        dataset_epsilon = mean(word_counts)

    print(f"\nProcessing {out_name} (rows {start_row}-{end_row-1}, {total} rows)...", flush=True)
    print(f"  Dataset epsilon (avg NLTK token count): {dataset_epsilon:.1f}", flush=True)

    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            text = clean_text(row.get("text", ""))
            tokens = nltk.word_tokenize(text)
            token_count = max(1, min(len(tokens), MAX_NLTK_TOKENS))
            eps_per_token = dataset_epsilon / token_count
            # Total doc epsilon = eps_per_token * token_count = dataset_epsilon
            doc_epsilon = eps_per_token * token_count  # = dataset_epsilon

            if _has_torch:
                torch.cuda.empty_cache()

            privatized = ""
            try:
                privatized = chunk_and_privatize(dp, text, doc_epsilon)
            except Exception as e:
                global_row = start_row + i
                print(f"  [WARN] Row {global_row} failed: {str(e)[:120]}", file=sys.stderr, flush=True)
                errors += 1

            writer.writerow({"id": row["id"], "text": privatized})

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{total} done", flush=True)

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run DP-Prompt privatization")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Single dataset filename (e.g. imdb.csv)")
    parser.add_argument("--start", type=int, default=0,
                        help="Start row index (inclusive, default 0)")
    parser.add_argument("--end", type=int, default=None,
                        help="End row index (exclusive, default all)")
    parser.add_argument("--epsilon", type=float, default=None,
                        help="Pre-computed dataset epsilon (skips recomputation)")
    parser.add_argument("--suffix", type=str, default="",
                        help="Output filename suffix (e.g. _chunk0)")
    parser.add_argument("--input-dir", type=Path, default=Path.home(),
                        help="Directory containing input CSV files (default: home dir)")
    args = parser.parse_args()

    INPUT_DIR = args.input_dir

    if not PRIVFILL_DIR.exists():
        print(f"ERROR: PrivFill not found at {PRIVFILL_DIR}")
        print("  Run: git clone https://github.com/sjmeis/PrivFill.git ~/PrivFill")
        sys.exit(1)

    print("Applying LLMDP patches...", flush=True)
    _patch_llmdp_file()

    sys.path.insert(0, str(PRIVFILL_DIR))
    from LLMDP import DPPrompt

    print("Loading DPPrompt model (flan-t5-large, ~3GB — downloading if needed)...", flush=True)
    dp = DPPrompt()
    print("Model loaded.", flush=True)

    start = time.time()

    if args.dataset:
        process_dataset(args.dataset, dp,
                        start_row=args.start,
                        end_row=args.end,
                        dataset_epsilon=args.epsilon,
                        suffix=args.suffix)
    else:
        for dataset in DATASETS:
            process_dataset(dataset, dp)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed / 60:.1f} min. Output in ~/dp_prompt_output/")
