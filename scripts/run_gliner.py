"""
Run GLiNER zero-shot NER PII redaction on the benchmark datasets.

GLiNER (Generalist and Lightweight NER) detects arbitrary entity types defined
at inference time — no fixed label set. This script uses urchade/gliner_multi_pii-v1,
a version fine-tuned specifically for PII detection across 50+ entity categories.

Unlike Presidio (rule-based) and OpenAI Privacy Filter (fixed 8 labels), GLiNER
can be directed at any PII taxonomy by changing the LABELS list, making it
useful for domain-specific privatization.

Two modes:
  redact  — delete detected PII spans
  replace — replace with [ENTITY_TYPE] tags

Outputs one CSV per dataset per mode with original columns plus 'privatized_text'.

Model: urchade/gliner_multi_pii-v1
  - Fine-tuned from gliner_multi-v2.1 on synthetic PII data
  - Multilingual (en, fr, de, es, pt, it)
  - Apache-2.0 licence

Usage (on server, inside a venv with gliner + torch):
    # All datasets, both modes:
    python3 ~/run_gliner.py

    # Single dataset:
    python3 ~/run_gliner.py --dataset imdb.csv

    # Single mode:
    python3 ~/run_gliner.py --mode redact

    # Different model:
    python3 ~/run_gliner.py --model knowledgator/gliner-pii-large-v1.0

    # Adjust detection threshold (default 0.5):
    python3 ~/run_gliner.py --threshold 0.4

Prerequisites:
    pip install gliner
"""

import argparse
import csv
import sys
import time
from pathlib import Path

INPUT_DIR  = Path.home()
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "gliner"

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

DEFAULT_MODEL = "urchade/gliner_multi_pii-v1"
DEFAULT_THRESHOLD = 0.5

# PII entity types to detect. GLiNER is zero-shot so these can be changed freely.
# This list covers the most privacy-relevant categories from the model card.
LABELS = [
    "person",
    "organization",
    "address",
    "email",
    "phone number",
    "date of birth",
    "social security number",
    "credit card number",
    "bank account number",
    "passport number",
    "driver's license number",
    "tax identification number",
    "national id number",
    "ip address",
    "username",
    "medical condition",
    "medication",
    "blood type",
    "license plate number",
]

# How many texts to pass to predict_entities at once.
# GLiNER processes each text independently; this just controls progress reporting.
BATCH_SIZE = 32


def apply_entities(text: str, entities: list, mode: str) -> str:
    """Replace or delete detected PII spans.

    Processes spans right-to-left so earlier character positions stay valid
    after each substitution.
    """
    sorted_ents = sorted(entities, key=lambda e: e["start"], reverse=True)
    result = text
    for ent in sorted_ents:
        start, end = ent["start"], ent["end"]
        if mode == "replace":
            tag = f"[{ent['label'].upper().replace(' ', '_')}]"
            result = result[:start] + tag + result[end:]
        else:  # redact
            result = result[:start] + result[end:]
    return result.strip()


def process_dataset(filename: str, model, mode: str, threshold: float):
    name        = filename.replace(".csv", "")
    input_path  = INPUT_DIR  / filename
    output_path = OUTPUT_DIR / f"{name}_gliner_{mode}.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader     = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows       = list(reader)

    total = len(rows)
    print(f"\nProcessing {filename} [{mode}] ({total} rows)...", flush=True)

    privatized = [""] * total
    errors     = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch_rows = rows[batch_start : batch_start + BATCH_SIZE]
        batch_texts = [r.get("text", "") for r in batch_rows]

        for j, text in enumerate(batch_texts):
            idx = batch_start + j
            try:
                entities = model.predict_entities(text, LABELS, threshold=threshold)
                privatized[idx] = apply_entities(text, entities, mode)
            except Exception as e:
                print(f"  [WARN] Row {idx} failed: {e}", file=sys.stderr, flush=True)
                privatized[idx] = ""
                errors += 1

        done = min(batch_start + BATCH_SIZE, total)
        if done % 100 == 0 or done == total:
            print(f"  {done}/{total} done", flush=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()
        for i, row in enumerate(rows):
            writer.writerow({"id": row["id"], "text": privatized[i]})

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run GLiNER zero-shot PII redaction on benchmark datasets"
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Single dataset filename (e.g. imdb.csv). Default: all datasets.",
    )
    parser.add_argument(
        "--mode",
        choices=MODES,
        default=None,
        help="redact (delete spans) or replace (entity tags). Default: both.",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help=f"GLiNER model to load (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Detection confidence threshold (default: {DEFAULT_THRESHOLD}).",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path.home(),
        help="Directory containing input CSV files (default: home dir)",
    )
    args = parser.parse_args()

    INPUT_DIR = args.input_dir

    try:
        from gliner import GLiNER
    except ImportError:
        print("ERROR: gliner is required.  pip install gliner")
        sys.exit(1)

    print(f"Loading {args.model}...", flush=True)
    model = GLiNER.from_pretrained(args.model)
    print("Model loaded.", flush=True)

    datasets = [args.dataset] if args.dataset else DATASETS
    modes    = [args.mode]    if args.mode    else MODES

    start = time.time()
    for dataset in datasets:
        for mode in modes:
            process_dataset(dataset, model, mode, args.threshold)
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")
