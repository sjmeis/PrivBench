"""
Run Philter PII redaction on the benchmark datasets.
Uses a thread pool for parallel requests to speed up processing.
Outputs a CSV per dataset with columns 'id' and 'text' (privatized).
"""

import argparse
import csv
import requests
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

PHILTER_BASE = "https://localhost:8080"
POLICY = "default"
DEFAULT_INPUT_DIR = Path.home()
DEFAULT_OUTPUT_DIR = Path("data/privatized/philter")
NUM_WORKERS = 8

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]


def redact(text: str, doc_id: str, base_url: str) -> str:
    resp = requests.post(
        f"{base_url}/api/filter",
        params={"c": "privbench", "d": doc_id, "p": POLICY},
        headers={"Content-type": "text/plain"},
        data=text.encode("utf-8"),
        timeout=120,
        verify=False,
    )
    resp.raise_for_status()
    return resp.text


def process_dataset(filename: str, input_dir: Path, output_dir: Path,
                    base_url: str):
    name = filename.replace(".csv", "")
    input_path = input_dir / filename
    output_path = output_dir / f"{name}_philter.csv"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Read all rows first
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    print(f"\nProcessing {filename} ({total} rows, {NUM_WORKERS} workers)...", flush=True)

    # Submit all rows in parallel
    results = {}
    errors = 0
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        future_to_idx = {
            executor.submit(redact, row["text"], row.get("id", f"{filename}_{i}"),
                            base_url): i
            for i, row in enumerate(rows)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                print(f"  [WARN] Row {idx} failed: {e}", file=sys.stderr, flush=True)
                results[idx] = ""
                errors += 1

            done = len(results)
            if done % 100 == 0:
                print(f"  {done}/{total} done", flush=True)

    # Write output with only id and text (privatized) columns
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()
        for i, row in enumerate(rows):
            writer.writerow({"id": row["id"], "text": results.get(i, "")})

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Philter PII redaction")
    parser.add_argument("--dataset", help="Run only this dataset (e.g., yelp, glue, imdb, wikitext)")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR,
                        help="Directory containing input CSVs (default: ~/)")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR,
                        help="Directory for output CSVs (default: data/privatized/philter/)")
    parser.add_argument("--url", default=PHILTER_BASE,
                        help="Philter base URL (default: https://localhost:8080)")
    args = parser.parse_args()

    try:
        r = requests.get(f"{args.url}/api/status", timeout=5, verify=False)
        print(f"Philter status: {r.text.strip()}", flush=True)
    except Exception as e:
        print(f"ERROR: Cannot reach Philter: {e}")
        sys.exit(1)

    if args.dataset:
        datasets_to_run = [f"{args.dataset}.csv"]
    else:
        datasets_to_run = DATASETS

    start = time.time()
    for dataset in datasets_to_run:
        process_dataset(dataset, args.input_dir, args.output_dir, args.url)
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed/60:.1f} min. Output in {args.output_dir}/")
