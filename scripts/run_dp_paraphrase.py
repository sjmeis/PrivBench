"""
Run DP-Paraphrase (DPParaphrase from DPMLM/LLMDP.py) on the benchmark datasets.

DP-Paraphrase (Mattern, Weggenmann & Kerschbaum, Findings of NAACL 2022) treats
temperature sampling in an autoregressive decoder as an instance of the exponential
mechanism.  The DPParaphrase class uses a GPT-2 model fine-tuned for paraphrasing
with prompt format "{text} >>>>> " and applies:
    temperature = 2 * sensitivity / epsilon
where sensitivity = |max_logit - min_logit| from the model's empirical logit range,
and logits are clipped to [min_logit, max_logit] before sampling.

Privacy budget: document-level epsilon = average NLTK token count of the dataset.
Each document is privatized with eps_per_token = dataset_epsilon / doc_token_count.
For short docs (fit in one GPT-2 call): pass eps_per_token directly to privatize().
For long docs (exceed 1024 model tokens): split into chunks, each chunk gets
dataset_epsilon / N_chunks under basic DP composition.

Reference: Mattern et al., NAACL 2022 — https://aclanthology.org/2022.findings-naacl.65/

Usage (on server, inside ~/dpmlm_venv):
    # Process all datasets sequentially:
    python3 ~/run_dp_paraphrase.py

    # Process a single dataset:
    python3 ~/run_dp_paraphrase.py --dataset imdb.csv

    # Process a row range (for parallel chunks), with pre-computed epsilon:
    python3 ~/run_dp_paraphrase.py --dataset imdb.csv --start 0 --end 333 --epsilon 223.7 --suffix _chunk0

Prerequisites:
    - DPMLM cloned at ~/DPMLM with DPParaphrase class in LLMDP.py
    - GPT-2 paraphraser model at ~/models/gpt2-paraphraser
    - Virtual environment with torch, transformers, mpmath, tqdm, nltk
      (reuse ~/dpmlm_venv: pip install mpmath tqdm)
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

PRIVFILL_DIR = Path.home() / "DPMLM"
INPUT_DIR = Path.home()
OUTPUT_DIR = Path.home() / "dp_paraphrase_output"

# Cap per-document NLTK token count for epsilon calculation.
MAX_NLTK_TOKENS = 400

# GPT-2 context window is 1024 tokens.
# privatize() generates max_new_tokens = len(prompt), so total = 2 * len(prompt).
# Each chunk's prompt (text + " >>>>> ") must be <= 512 tokens.
# Reserve ~10 tokens for the " >>>>> " suffix.
MAX_MODEL_TOKENS = 1024
PROMPT_OVERHEAD = 10

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
    """Privatize text, chunking if it exceeds GPT-2's 1024-token window.

    For texts that fit in one call: use dp.privatize() with doc_epsilon.
    For longer texts: split into N chunks of <= (MAX_MODEL_TOKENS - PROMPT_OVERHEAD)
    subword tokens, privatize each with doc_epsilon / N (basic composition),
    and join with spaces.
    """
    # Total seq = 2 * prompt_tokens <= MAX_MODEL_TOKENS, so prompt <= MAX/2
    usable_tokens = MAX_MODEL_TOKENS // 2 - PROMPT_OVERHEAD
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
    out_name = filename.replace(".csv", f"_dp_paraphrase{suffix}.csv")
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
            doc_epsilon_val = eps_per_token * token_count  # = dataset_epsilon

            if _has_torch:
                torch.cuda.empty_cache()

            privatized = ""
            try:
                privatized = chunk_and_privatize(dp, text, doc_epsilon_val)
            except Exception as e:
                global_row = start_row + i
                print(f"  [WARN] Row {global_row} failed: {str(e)[:120]}", file=sys.stderr, flush=True)
                errors += 1

            writer.writerow({"id": row["id"], "text": privatized})

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{total} done", flush=True)

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run DP-Paraphrase privatization")
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
    parser.add_argument("--input-dir", type=str, default=None,
                        help="Input directory (default: ~/)")
    parser.add_argument("--output-dir", type=str, default=None,
                        help="Output directory (default: ~/dp_paraphrase_output/)")
    args = parser.parse_args()

    if args.input_dir:
        INPUT_DIR = Path(args.input_dir)
    if args.output_dir:
        OUTPUT_DIR = Path(args.output_dir) / "dp-paraphrase"

    if not PRIVFILL_DIR.exists():
        print(f"ERROR: DPMLM not found at {PRIVFILL_DIR}")
        print("  Run: git clone <DPMLM repo> ~/DPMLM")
        sys.exit(1)

    sys.path.insert(0, str(PRIVFILL_DIR))
    from LLMDP import DPParaphrase

    print("Loading DPParaphrase model (GPT-2 paraphraser from ~/models/gpt2-paraphraser)...", flush=True)
    dp = DPParaphrase()
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
    print(f"\nDone in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}/")
