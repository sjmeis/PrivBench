"""
Run Textwash anonymization on the benchmark datasets.
Textwash takes .txt files as input, so each row's text is written to a
temp file, anon.py is invoked once per dataset, and the output files are
read back to build the output CSV.

Usage (on server, inside ~/textwash/venv):
    python3 ~/run_textwash.py                  # run all 4 default datasets
    python3 ~/run_textwash.py --input ~/yelp_new.csv   # run a single CSV
    python3 ~/run_textwash.py --input ~/yelp_new.csv --output ~/out.csv
"""

import argparse
import csv
import shutil
import subprocess
import sys
import time
from pathlib import Path

TEXTWASH_DIR = Path.home() / "textwash"
ANON_SCRIPT = TEXTWASH_DIR / "anon.py"
INPUT_DIR = Path.home()                          # where the 4 *.csv files live
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "textwash"
TMP_BASE = Path.home() / "textwash_tmp"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]


def process_dataset(input_path: Path, output_path: Path):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    dataset_name = input_path.stem
    tmp_in = TMP_BASE / dataset_name / "in"
    tmp_out = TMP_BASE / dataset_name / "out"
    tmp_in.mkdir(parents=True, exist_ok=True)
    tmp_out.mkdir(parents=True, exist_ok=True)

    # Read all rows
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)
    print(f"\nProcessing {input_path.name} ({total} rows)...", flush=True)

    # Write each row's text to a .txt file named by its index
    for i, row in enumerate(rows):
        txt_file = tmp_in / f"{i}.txt"
        txt_file.write_text(row.get("text", ""), encoding="utf-8")

    # Run anon.py once for the whole dataset (model loads once)
    cmd = [
        sys.executable,
        str(ANON_SCRIPT),
        "--language", "en",
        "--input_dir", str(tmp_in),
        "--output_dir", str(tmp_out),
        "--cpu",
    ]
    print(f"  Running: {' '.join(cmd)}", flush=True)
    # Must run from TEXTWASH_DIR because config.py uses ./data/{language} as relative model path
    result = subprocess.run(cmd, capture_output=False, text=True, cwd=TEXTWASH_DIR)
    if result.returncode != 0:
        print(f"  [WARN] anon.py exited with code {result.returncode}", file=sys.stderr, flush=True)

    # Read back outputs and build result rows
    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()
        for i, row in enumerate(rows):
            out_file = tmp_out / f"{i}.txt"
            if out_file.exists():
                privatized = out_file.read_text(encoding="utf-8")
            else:
                print(f"  [WARN] Output missing for row {i}", file=sys.stderr, flush=True)
                privatized = ""
                errors += 1
            writer.writerow({"id": row["id"], "text": privatized})

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)

    # Clean up temp dirs for this dataset
    shutil.rmtree(TMP_BASE / dataset_name, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Textwash anonymization")
    parser.add_argument("--input", type=Path, help="Path to a single input CSV")
    parser.add_argument("--output", type=Path, help="Path for the output CSV (used with --input)")
    parser.add_argument("--input-dir", type=Path, default=Path.home(),
                        help="Directory containing input CSV files (default: home dir)")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Run on a single dataset filename (e.g. tab.csv)")
    args = parser.parse_args()

    INPUT_DIR = args.input_dir

    if not ANON_SCRIPT.exists():
        print(f"ERROR: anon.py not found at {ANON_SCRIPT}")
        sys.exit(1)

    start = time.time()
    if args.input:
        inp = args.input
        out = args.output or (OUTPUT_DIR / f"{inp.stem}_textwash.csv")
        process_dataset(inp, out)
    elif args.dataset:
        inp = INPUT_DIR / args.dataset
        out = OUTPUT_DIR / args.dataset.replace(".csv", "_textwash.csv")
        process_dataset(inp, out)
    else:
        for dataset in DATASETS:
            inp = INPUT_DIR / dataset
            out = OUTPUT_DIR / dataset.replace(".csv", "_textwash.csv")
            process_dataset(inp, out)
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")
