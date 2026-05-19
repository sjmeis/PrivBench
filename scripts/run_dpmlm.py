"""
Run DP-MLM (Differentially Private Masked Language Model, ACL 2024) on the benchmark datasets.

Privacy budget: document-level epsilon = average word count of the dataset.
Each document is privatized with epsilon_per_token = dataset_epsilon / doc_token_count,
so every document gets the same total privacy budget regardless of length.

Usage (on server, inside ~/dpmlm_venv):
    # Process all datasets sequentially:
    python3 ~/run_dpmlm.py

    # Process a single dataset:
    python3 ~/run_dpmlm.py --dataset imdb.csv

    # Process a row range (for parallel chunks), with pre-computed epsilon:
    python3 ~/run_dpmlm.py --dataset imdb.csv --start 0 --end 333 --epsilon 223.7 --suffix _chunk0

Prerequisites:
    - DPMLM cloned at ~/DPMLM
      git clone https://github.com/sjmeis/DPMLM.git ~/DPMLM
    - Virtual environment:
      python3 -m venv ~/dpmlm_venv
      source ~/dpmlm_venv/bin/activate
      pip install -r ~/DPMLM/requirements.txt
      python -m spacy download en_core_web_md
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

DPMLM_DIR = Path.home() / "DPMLM"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "dpmlm"

# Cap per-document token count for epsilon calculation.
# DPMLM's sliding window handles long texts internally.
MAX_NLTK_TOKENS = 400

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]


def process_dataset(filename: str, M, start_row=0, end_row=None,
                    dataset_epsilon=None, suffix="", input_dir=None):
    if input_dir is None:
        input_dir = Path.home()
    input_path = input_dir / filename
    out_name = filename.replace(".csv", f"_dpmlm{suffix}.csv")
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

    # Compute or reuse dataset-level epsilon = average token count
    if dataset_epsilon is None:
        word_counts = [len(nltk.word_tokenize(clean_text(r["text"]))) for r in all_rows]
        dataset_epsilon = mean(word_counts)

    print(f"\nProcessing {out_name} (rows {start_row}-{end_row-1}, {total} rows)...", flush=True)
    print(f"  Dataset epsilon (avg word count): {dataset_epsilon:.1f}", flush=True)

    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            text = clean_text(row.get("text", ""))
            tokens = nltk.word_tokenize(text)
            token_count = max(1, min(len(tokens), MAX_NLTK_TOKENS))
            eps_per_token = dataset_epsilon / token_count

            if _has_torch:
                torch.cuda.empty_cache()

            privatized = ""
            try:
                result = M.dpmlm_rewrite(text, epsilon=eps_per_token)
                # dpmlm_rewrite returns (rewritten_str, n_perturbed, n_total)
                privatized = result[0] if isinstance(result, tuple) else str(result)
            except Exception as e:
                global_row = start_row + i
                print(f"  [WARN] Row {global_row} failed: {str(e)[:120]}", file=sys.stderr, flush=True)
                errors += 1

            writer.writerow({"id": row["id"], "text": privatized})

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{total} done", flush=True)

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


def _patch_dpmlm_file():
    """Patch upstream DPMLM.py on disk before importing. Idempotent.

    Fixes two bugs present in the original DPMLM repo:

    Bug 2 — sliding window uses NLTK word index instead of RoBERTa subword index.
      Symptom: ValueError "50264 is not in list" for tokens deep in long documents
      because the <mask> token falls outside the 240-subword context window.
      Fix: center the window on encoded.index(mask_token_id) instead of start_index.

    Bug 3 — nth_repl re-tokenizes a space-joined token string, causing NLTK to
      flip closing '' to opening `` context-dependently (e.g. inside quoted phrases).
      Symptom: same ValueError as Bug 2 but triggered by documents containing quotes.
      Fix: replace the target token directly in the split_sent list, no re-tokenization.
    """
    dpmlm_py = DPMLM_DIR / "DPMLM.py"
    src = dpmlm_py.read_text(encoding="utf-8")
    patched = src
    applied = []

    # Bug 3 patch -------------------------------------------------------
    _B3_OLD = (
        "        # Masks the target word in the original sentence.\n"
        "        masked_sent = ' '.join(split_sent)\n"
        "        masked_sent = nth_repl(masked_sent, target, self.tokenizer.mask_token, n)\n"
        "        n = [n]"
    )
    _B3_NEW = (
        "        # Masks the target word directly in the token list (patched: avoids\n"
        "        # NLTK context-dependent '' vs `` flip when nth_repl re-tokenizes).\n"
        "        _count = 0\n"
        "        masked_tokens = split_sent.copy()\n"
        "        _replaced = False\n"
        "        for _idx, _tok in enumerate(masked_tokens):\n"
        "            if _tok == target:\n"
        "                _count += 1\n"
        "                if _count == n:\n"
        "                    masked_tokens[_idx] = self.tokenizer.mask_token\n"
        "                    _replaced = True\n"
        "                    break\n"
        "        masked_sent = ' '.join(masked_tokens) if _replaced else ' '.join(split_sent)\n"
        "        n = [n]"
    )
    if _B3_OLD in patched:
        patched = patched.replace(_B3_OLD, _B3_NEW, 1)
        applied.append("Bug 3 (nth_repl quote flip)")

    # Bug 2 patch -------------------------------------------------------
    _B2_OLD = (
        "        lower, upper = self.sliding_window(encoded, start_index,"
    )
    _B2_NEW = (
        "        _mask_sw_idx = (encoded.index(self.tokenizer.mask_token_id)\n"
        "                        if self.tokenizer.mask_token_id in encoded\n"
        "                        else start_index)\n"
        "        lower, upper = self.sliding_window(encoded, _mask_sw_idx,"
    )
    if _B2_OLD in patched:
        patched = patched.replace(_B2_OLD, _B2_NEW, 1)
        applied.append("Bug 2 (sliding window subword index)")

    if patched != src:
        dpmlm_py.write_text(patched, encoding="utf-8")
        print(f"  Patched DPMLM.py: {', '.join(applied)}", flush=True)
    elif "_mask_sw_idx" in src and "masked_tokens" in src:
        print("  DPMLM.py patches already applied.", flush=True)
    else:
        print("  [WARN] DPMLM.py patch patterns not found — check DPMLM version.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run DP-MLM privatization")
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
                        help="Input directory (default ~/)")
    args = parser.parse_args()

    INPUT_DIR = Path(args.input_dir) if args.input_dir else Path.home()

    if not DPMLM_DIR.exists():
        print(f"ERROR: DPMLM not found at {DPMLM_DIR}")
        print("  Run: git clone https://github.com/sjmeis/DPMLM.git ~/DPMLM")
        sys.exit(1)

    # The current DPMLM repo uses a package layout under src/dpmlm/.
    # Older versions had a flat DPMLM.py that needed patching; the new
    # version already fixes those bugs.
    dpmlm_src = DPMLM_DIR / "src"
    dpmlm_pkg = dpmlm_src / "dpmlm"
    if dpmlm_pkg.exists():
        sys.path.insert(0, str(dpmlm_src))
        from dpmlm import DPMLM
    else:
        # Legacy flat layout
        print("Applying DPMLM patches...", flush=True)
        _patch_dpmlm_file()
        sys.path.insert(0, str(DPMLM_DIR))
        from DPMLM import DPMLM

    print("Loading DPMLM model (RoBERTa-base + spacy en_core_web_md)...", flush=True)
    M = DPMLM()
    print("Model loaded.", flush=True)

    start = time.time()

    if args.dataset:
        # Single dataset (optionally a row range)
        process_dataset(args.dataset, M,
                        start_row=args.start,
                        end_row=args.end,
                        dataset_epsilon=args.epsilon,
                        suffix=args.suffix,
                        input_dir=INPUT_DIR)
    else:
        # All datasets, sequentially
        for dataset in DATASETS:
            process_dataset(dataset, M, input_dir=INPUT_DIR)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}/")
