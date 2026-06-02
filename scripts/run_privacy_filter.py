"""
Run OpenAI Privacy Filter PII redaction on the benchmark datasets.
Two modes: redact (delete PII spans) and replace (replace with entity-type tags).
Outputs one CSV per dataset per mode with columns 'id' and 'text'.

Model: openai/privacy-filter (token-classification, 1.5B params, ~50M active)
Detects 8 PII categories:
  account_number, private_address, private_email, private_person,
  private_phone, private_url, private_date, secret

Usage (on server, inside a venv with transformers + torch):
    # All datasets, both modes:
    python3 ~/run_privacy_filter.py

    # Local run (datasets in data/interim/):
    python3 scripts/run_privacy_filter.py --input-dir data/interim/

    # Single dataset:
    python3 ~/run_privacy_filter.py --dataset imdb.csv

    # Single mode:
    python3 ~/run_privacy_filter.py --mode redact

    # Both flags:
    python3 ~/run_privacy_filter.py --dataset imdb.csv --mode replace

Prerequisites:
    pip install transformers torch accelerate
"""

import argparse
import csv
import sys
import time
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "privacy_filter"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

MODES = ["redact", "replace"]


def apply_entities(text: str, entities: list, mode: str) -> str:
    """Replace or delete detected PII spans in text.

    Processes spans from right to left so earlier character positions
    stay valid after each substitution.
    """
    sorted_ents = sorted(entities, key=lambda e: e["start"], reverse=True)
    result = text
    for ent in sorted_ents:
        start, end = ent["start"], ent["end"]
        if mode == "replace":
            tag = f"[{ent['entity_group'].upper()}]"
            result = result[:start] + tag + result[end:]
        else:  # redact
            result = result[:start] + result[end:]
    return result.strip()


def run_ner(filename: str, pipe, input_dir: Path, batch_size: int):
    """Run NER inference on a dataset. Returns (rows, texts, all_entities)."""
    input_path = input_dir / filename

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    print(f"\nRunning NER on {filename} ({total} rows)...", flush=True)

    texts = [row.get("text", "") for row in rows]
    all_entities = [[] for _ in range(total)]
    errors = 0

    for batch_start in range(0, total, batch_size):
        batch_texts = texts[batch_start : batch_start + batch_size]
        batch_indices = list(range(batch_start, min(batch_start + batch_size, total)))

        try:
            batch_results = pipe(batch_texts)
            for j, entities in enumerate(batch_results):
                all_entities[batch_indices[j]] = entities
        except Exception as batch_err:
            print(
                f"  [WARN] Batch {batch_start}-{batch_indices[-1]} failed "
                f"({batch_err}), falling back to row-by-row",
                file=sys.stderr,
                flush=True,
            )
            for j, text in enumerate(batch_texts):
                idx = batch_indices[j]
                try:
                    entities = pipe(text)
                    all_entities[idx] = entities
                except Exception as row_err:
                    print(
                        f"  [WARN] Row {idx} failed: {row_err}",
                        file=sys.stderr,
                        flush=True,
                    )
                    errors += 1

        done = min(batch_start + batch_size, total)
        if done % 100 == 0 or done == total:
            print(f"  {done}/{total} done", flush=True)

    if errors:
        print(f"  NER completed with {errors} errors", flush=True)

    return rows, texts, all_entities


def write_output(rows, texts, all_entities, filename: str, mode: str):
    """Apply entities in the given mode and write output CSV."""
    name = filename.replace(".csv", "")
    output_path = OUTPUT_DIR / f"{name}_privacy_filter_{mode}.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()
        for i, row in enumerate(rows):
            privatized = apply_entities(texts[i], all_entities[i], mode)
            writer.writerow({"id": row["id"], "text": privatized})

    print(f"  Saved {mode} -> {output_path}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run OpenAI Privacy Filter PII redaction on benchmark datasets"
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Single dataset filename (e.g. imdb.csv). Default: all datasets.",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=MODES,
        default=None,
        help="Redaction mode: redact (delete spans) or replace (entity tags). "
        "Default: both.",
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        default=str(Path.home()),
        help="Directory containing input CSVs. Default: home directory.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
        help="Number of texts per pipeline call. Default: 8.",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    batch_size = args.batch_size

    try:
        import torch
        from transformers import pipeline
    except ImportError:
        print("ERROR: transformers and torch are required.")
        print("  pip install transformers torch accelerate")
        sys.exit(1)

    device = 0 if torch.cuda.is_available() else -1
    device_name = "cuda" if device == 0 else "cpu"
    print(f"Loading openai/privacy-filter on {device_name}...", flush=True)

    pipe = pipeline(
        task="token-classification",
        model="openai/privacy-filter",
        aggregation_strategy="simple",
        device=device,
    )
    print("Model loaded.", flush=True)

    datasets = [args.dataset] if args.dataset else DATASETS
    modes = [args.mode] if args.mode else MODES

    start = time.time()
    for dataset in datasets:
        rows, texts, all_entities = run_ner(dataset, pipe, input_dir, batch_size)
        for mode in modes:
            write_output(rows, texts, all_entities, dataset, mode)
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}/")
