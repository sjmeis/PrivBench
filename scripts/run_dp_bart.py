"""
Run DP-Bart (DPBart from PrivFill/LLMDP.py) on the benchmark datasets.

Privacy budget: document-level epsilon = average NLTK token count of the dataset.
Each document is privatized with eps_per_token = dataset_epsilon / doc_token_count.
For short docs (fit in one BART call): pass doc_epsilon directly to privatize().
For long docs (exceed 512 model tokens): split into chunks, each chunk gets
dataset_epsilon / N_chunks under basic DP composition.

Usage (on server, inside ~/dpmlm_venv):
    # Process all datasets sequentially:
    python3 ~/run_dp_bart.py

    # Process a single dataset:
    python3 ~/run_dp_bart.py --dataset imdb.csv

    # Process a row range (for parallel chunks), with pre-computed epsilon:
    python3 ~/run_dp_bart.py --dataset imdb.csv --start 0 --end 333 --epsilon 223.7 --suffix _chunk0

Prerequisites:
    - PrivFill cloned at ~/PrivFill
      git clone https://github.com/sjmeis/PrivFill.git ~/PrivFill
    - Virtual environment with torch, transformers, mpmath, tqdm, nltk
      (reuse ~/dpmlm_venv: already has all required packages)
    - facebook/bart-large (~1.6GB) auto-downloads from HuggingFace on first run
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
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "dp_bart"


def _patch_llmdp_dpbart():
    """Patch DPBart.privatize() in LLMDP.py for transformers>=5 / float16 CUDA. Idempotent.

    Newer transformers loads BART in float16 on CUDA. DPBart.privatize() casts the
    noisy encoder hidden state to .float() (float32), causing a dtype mismatch in
    the decoder's cross-attention.
    Fix: replace .float().to(self.device) with .to(self.device).to(decoder dtype).
    """
    llmdp_py = PRIVFILL_DIR / "LLMDP.py"
    src = llmdp_py.read_text(encoding="utf-8")

    _OLD = (
        'enc_output["last_hidden_state"] = self.noise(self.clip('
        'enc_output["last_hidden_state"].cpu()), epsilon=epsilon, delta=self.delta, '
        'method=method).float().to(self.device)'
    )
    _NEW = (
        'enc_output["last_hidden_state"] = self.noise(self.clip('
        'enc_output["last_hidden_state"].cpu()), epsilon=epsilon, delta=self.delta, '
        'method=method).to(self.device).to(next(self.decoder.parameters()).dtype)'
    )

    if _OLD in src:
        llmdp_py.write_text(src.replace(_OLD, _NEW, 1), encoding="utf-8")
        print("  Patched LLMDP.py: DPBart dtype fix for transformers>=5 / float16", flush=True)
    elif 'next(self.decoder.parameters()).dtype' in src:
        print("  LLMDP.py DPBart patch already applied.", flush=True)
    else:
        print("  [WARN] LLMDP.py DPBart patch pattern not found — check PrivFill version.", flush=True)

# Cap per-document NLTK token count for epsilon calculation.
# BART truncates input to 512 model tokens; we handle long docs via chunking.
MAX_NLTK_TOKENS = 400

# BART was trained with 1024-position sequences, but privatize() hard-caps at 512.
# We reserve ~15 tokens for BART special tokens overhead (<s>, </s>, etc.).
MAX_MODEL_TOKENS = 512
BART_OVERHEAD = 15

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
    """Privatize text, chunking if it exceeds BART's 512-token window.

    For texts that fit in one call: use dp.privatize() with doc_epsilon.
    For longer texts: split into N chunks of <= (MAX_MODEL_TOKENS - BART_OVERHEAD)
    subword tokens, privatize each with doc_epsilon / N (basic composition),
    and join with spaces.
    """
    usable_tokens = MAX_MODEL_TOKENS - BART_OVERHEAD
    full_ids = dp.tokenizer.encode(text, add_special_tokens=False)

    if len(full_ids) <= usable_tokens:
        return dp.privatize(text, epsilon=doc_epsilon, method="analytic_gaussian")

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
        privatized_chunks.append(
            dp.privatize(chunk_text, epsilon=eps_per_chunk, method="analytic_gaussian")
        )

    return " ".join(privatized_chunks)


def process_dataset(filename: str, dp, start_row=0, end_row=None,
                    dataset_epsilon=None, suffix=""):
    input_path = INPUT_DIR / filename
    out_name = filename.replace(".csv", f"_dp_bart{suffix}.csv")
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
    parser = argparse.ArgumentParser(description="Run DP-Bart privatization")
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
    _patch_llmdp_dpbart()

    sys.path.insert(0, str(PRIVFILL_DIR))
    from LLMDP import DPBart

    print("Loading DPBart model (facebook/bart-large, ~1.6GB — downloading if needed)...", flush=True)
    dp = DPBart(model="facebook/bart-large")
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
    print(f"\nDone in {elapsed / 60:.1f} min. Output in ~/dp_bart_output/")