"""
Run Microsoft Presidio PII anonymization on the benchmark datasets.
Two operator modes: redact (delete PII) and replace (entity-type tags).
Outputs 8 CSVs (4 datasets x 2 modes) with an added 'privatized_text' column.

Usage (on server, inside ~/presidio_venv):
    python3 ~/run_presidio.py
"""

import argparse
import csv
import sys
import time
from pathlib import Path

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

INPUT_DIR = Path.home()
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "presidio"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

OPERATORS = {
    "redact":  {"DEFAULT": OperatorConfig("redact")},
    "replace": {"DEFAULT": OperatorConfig("replace")},
}


def process_dataset(filename: str, analyzer: AnalyzerEngine, anonymizer: AnonymizerEngine):
    input_path = INPUT_DIR / filename
    OUTPUT_DIR.mkdir(exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)
    print(f"\nProcessing {filename} ({total} rows)...", flush=True)

    # Analyze each row once, store results
    analyses = []
    for i, row in enumerate(rows):
        text = row.get("text", "")
        try:
            results = analyzer.analyze(text=text, language="en")
        except Exception as e:
            print(f"  [WARN] Row {i} analyze failed: {e}", file=sys.stderr, flush=True)
            results = None
        analyses.append((text, results))
        if (i + 1) % 100 == 0:
            print(f"  Analyzed {i + 1}/{total}", flush=True)

    # Write one output file per operator mode
    for mode, ops in OPERATORS.items():
        out_name = filename.replace(".csv", f"_presidio_{mode}.csv")
        output_path = OUTPUT_DIR / out_name

        errors = 0
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "text"])
            writer.writeheader()
            for i, row in enumerate(rows):
                text, results = analyses[i]
                if results is None:
                    privatized = ""
                    errors += 1
                else:
                    try:
                        anonymized = anonymizer.anonymize(
                            text=text,
                            analyzer_results=results,
                            operators=ops,
                        )
                        privatized = anonymized.text
                    except Exception as e:
                        print(f"  [WARN] Row {i} {mode} failed: {e}", file=sys.stderr, flush=True)
                        privatized = ""
                        errors += 1
                writer.writerow({"id": row["id"], "text": privatized})

        print(f"  Saved {out_name} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Presidio PII anonymization on datasets.")
    parser.add_argument("--input-dir", type=Path, default=Path.home(),
                        help="Directory containing input CSV files (default: home dir)")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Run on a single dataset filename (e.g. tab.csv)")
    args = parser.parse_args()

    INPUT_DIR = args.input_dir
    datasets = [args.dataset] if args.dataset else DATASETS

    print("Initializing Presidio engines...", flush=True)
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
    print("Ready.", flush=True)

    start = time.time()
    for dataset in datasets:
        process_dataset(dataset, analyzer, anonymizer)
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")
