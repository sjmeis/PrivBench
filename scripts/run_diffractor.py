"""
Run Diffractor word-level Metric Differential Privacy on the benchmark datasets.

Privacy budget: document-level epsilon = average word count of the dataset.
Each document is privatized with epsilon_per_word = dataset_epsilon / doc_word_count,
so every document gets the same total privacy budget regardless of length.

Usage:
    python scripts/run_diffractor.py                                        # all datasets
    python scripts/run_diffractor.py --dataset tab.csv                      # single dataset
    python scripts/run_diffractor.py --input-dir data/interim/ --dataset tab.csv

Prerequisites:
    - Diffractor cloned at ~/Diffractor
    - pip install faiss_cpu gensim nltk numpy tqdm requests
"""

import argparse
import csv
import sys
import time
from pathlib import Path
from statistics import mean

import nltk
nltk.download("punkt_tab", quiet=True)
nltk.download("stopwords", quiet=True)

DIFFRACTOR_DIR = Path.home() / "Diffractor"
INPUT_DIR = Path.home()
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "diffractor"
METHOD = "geometric"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]


def process_dataset(filename: str, D, input_dir: Path = None):
    if input_dir is None:
        input_dir = INPUT_DIR
    input_path = input_dir / filename
    output_path = OUTPUT_DIR / filename.replace(".csv", "_diffractor.csv")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)

    # Compute dataset-level epsilon = average token count across all documents
    word_counts = [len(nltk.word_tokenize(row["text"])) for row in rows]
    dataset_epsilon = mean(word_counts)
    print(
        f"\nProcessing {filename} ({total} rows)...",
        flush=True,
    )
    print(
        f"  Dataset epsilon (avg word count): {dataset_epsilon:.1f}",
        flush=True,
    )

    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            text = row.get("text", "")
            token_count = max(1, len(nltk.word_tokenize(text)))
            eps_per_token = dataset_epsilon / token_count

            try:
                result = D.rewrite(text, epsilon=eps_per_token)
                privatized = result[0] if result else ""
            except Exception as e:
                print(f"  [WARN] Row {i} failed: {e}", file=sys.stderr, flush=True)
                privatized = ""
                errors += 1

            writer.writerow({"id": row["id"], "text": privatized})

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{total} done", flush=True)

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Diffractor privatization")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Run only this dataset filename (e.g. yelp.csv)")
    parser.add_argument("--input-dir", type=Path, default=Path.home(),
                        help="Directory containing input CSVs (default: ~/)")
    args = parser.parse_args()

    INPUT_DIR = args.input_dir  # noqa: F811

    if not DIFFRACTOR_DIR.exists():
        print(f"ERROR: Diffractor not found at {DIFFRACTOR_DIR}")
        print("  Run: git clone https://github.com/sjmeis/Diffractor.git ~/Diffractor")
        sys.exit(1)

    sys.path.insert(0, str(DIFFRACTOR_DIR / "src"))
    from diffractor import Diffractor, DiffractorConfig

    config = DiffractorConfig(method=METHOD, replace_stopwords=False, verbose=False)

    print("Loading embedding models (this may take a minute)...", flush=True)
    D = Diffractor(config=config)
    D.start()
    print("Models loaded.", flush=True)

    datasets_to_run = [args.dataset] if args.dataset else DATASETS

    start = time.time()
    try:
        for dataset in datasets_to_run:
            process_dataset(dataset, D, input_dir=INPUT_DIR)
    finally:
        D.close()
    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}/")
