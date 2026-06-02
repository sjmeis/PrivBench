"""
Run SanText / SanText+ word-level differential privacy on the benchmark datasets.

SanText uses the exponential mechanism with GloVe word embeddings to replace each
word with a semantically nearby word.  SanText+ only sanitises "sensitive" words
(the most frequent N%) and keeps non-sensitive words with probability 1-p.

Privacy budget (document-level, same convention as Diffractor / DP-Prompt):
    dataset_epsilon = mean(nltk_token_count) across all 1000 docs
    eps_per_token   = dataset_epsilon / nltk_token_count(doc)
    total doc budget = eps_per_token × N_tokens = dataset_epsilon  (basic composition)

Performance: precomputes the distance matrix once (epsilon-independent), then
applies per-word softmax rows on the fly.  Avoids materializing V×V prob_matrix
per document.

Usage (on server, inside ~/dpmlm_venv):
    python3 ~/run_santext.py                            # both methods, all datasets
    python3 ~/run_santext.py --method SanText            # SanText only
    python3 ~/run_santext.py --method SanText_plus       # SanText+ only
    python3 ~/run_santext.py --dataset imdb.csv  # single dataset

Prerequisites:
    - GloVe embeddings at ~/SanText/data/glove.840B.300d.txt
    - pip install scipy scikit-learn spacy nltk tqdm numpy
"""

import argparse
import csv
import re
import sys
import time
from collections import Counter
from pathlib import Path
from statistics import mean

import numpy as np
from scipy.special import softmax
from sklearn.metrics.pairwise import euclidean_distances
from tqdm import tqdm

import nltk
nltk.download("punkt_tab", quiet=True)

from spacy.lang.en import English

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SANTEXT_DIR = Path.home() / "SanText"
GLOVE_PATH = SANTEXT_DIR / "data" / "glove.840B.300d.txt"
INPUT_DIR = Path.home()                        # where the 4 *.csv files live
OUTPUT_DIR = Path.home() / "santext_output"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

# SanText+ hyper-parameters (paper defaults)
SENSITIVE_WORD_PERCENTAGE = 0.5
P_NON_SENSITIVE = 0.2          # prob of sanitising a non-sensitive word

SEED = 42


def clean_text(text: str) -> str:
    """Strip HTML tags and normalise whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def word_normalize(word: str) -> str:
    """Unicode NFD normalisation (matches SanText repo utils.py)."""
    import unicodedata
    return unicodedata.normalize("NFD", word)


# ---------------------------------------------------------------------------
# Vocab building
# ---------------------------------------------------------------------------
def build_vocab(datasets: list[str], tokenizer) -> Counter:
    """Build a word-frequency Counter from all text columns across datasets."""
    vocab: Counter = Counter()
    for fname in datasets:
        path = INPUT_DIR / fname
        if not path.exists():
            print(f"  [WARN] {path} not found, skipping", flush=True)
            continue
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = clean_text(row.get("text", ""))
                tokens = [t.text for t in tokenizer(text)]
                vocab.update(tokens)
    return vocab


# ---------------------------------------------------------------------------
# GloVe loading
# ---------------------------------------------------------------------------
def load_glove(vocab: Counter) -> tuple[dict, np.ndarray]:
    """Load GloVe embeddings filtered to vocab words."""
    word2id: dict[str, int] = {}
    embeddings: list[list[float]] = []

    print(f"Loading GloVe from {GLOVE_PATH} ...", flush=True)
    num_lines = sum(1 for _ in open(GLOVE_PATH, encoding="utf-8"))

    with open(GLOVE_PATH, encoding="utf-8") as f:
        first_line = f.readline().rstrip().split(" ")
        if len(first_line) != 2:
            f.seek(0)
        for row in tqdm(f, total=num_lines - 1, desc="Loading GloVe"):
            parts = row.rstrip().split(" ")
            word = word_normalize(parts[0])
            if word in vocab and word not in word2id:
                word2id[word] = len(embeddings)
                embeddings.append([float(x) for x in parts[1:]])

    emb_matrix = np.array(embeddings, dtype="f")
    print(f"  Loaded {len(word2id)} word vectors ({emb_matrix.shape})", flush=True)
    return word2id, emb_matrix


# ---------------------------------------------------------------------------
# Per-word sampling (no full prob_matrix materialisation)
# ---------------------------------------------------------------------------
def _sample_word(sim_row: np.ndarray, epsilon: float) -> int:
    """Sample a replacement word index from a single sim_matrix row."""
    logits = epsilon * sim_row / 2
    probs = softmax(logits)
    return np.random.choice(len(probs), p=probs)


def sanitize_doc_santext(doc_tokens: list[str], word2id: dict,
                         sim_matrix: np.ndarray, epsilon: float,
                         id2word: dict, all_words: list[str]) -> str:
    """SanText: replace every word via exponential mechanism (row-wise softmax)."""
    new_doc = []
    for word in doc_tokens:
        nw = word_normalize(word)
        if nw in word2id:
            idx = word2id[nw]
            sampled = _sample_word(sim_matrix[idx], epsilon)
            new_doc.append(id2word[sampled])
        else:
            new_doc.append(all_words[np.random.randint(len(all_words))])
    return " ".join(new_doc)


def sanitize_doc_santext_plus(doc_tokens: list[str], word2id: dict,
                              sword2id: dict, id2sword: dict,
                              sim_matrix: np.ndarray, epsilon: float,
                              all_words: list[str], p: float) -> str:
    """SanText+: only sanitise sensitive words; keep non-sensitive with prob 1-p."""
    new_doc = []
    for word in doc_tokens:
        nw = word_normalize(word)
        if nw in word2id:
            if nw in sword2id:
                idx = word2id[nw]
                sampled = _sample_word(sim_matrix[idx], epsilon)
                new_doc.append(id2sword[sampled])
            else:
                if np.random.random() <= p:
                    idx = word2id[nw]
                    sampled = _sample_word(sim_matrix[idx], epsilon)
                    new_doc.append(id2sword[sampled])
                else:
                    new_doc.append(word)
        else:
            new_doc.append(all_words[np.random.randint(len(all_words))])
    return " ".join(new_doc)


# ---------------------------------------------------------------------------
# Dataset processing
# ---------------------------------------------------------------------------
def process_dataset(filename: str, method: str, tokenizer,
                    word2id: dict, sim_matrix_santext: np.ndarray,
                    sword2id: dict, id2sword: dict,
                    sim_matrix_plus: np.ndarray,
                    all_words: list[str]):
    input_path = INPUT_DIR / filename
    suffix = "_santext" if method == "SanText" else "_santext_plus"
    subdir = "santext" if method == "SanText" else "santext_plus"
    out_dir = OUTPUT_DIR / subdir
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / filename.replace(".csv", f"{suffix}.csv")

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)

    # Compute dataset-level epsilon = average NLTK token count
    word_counts = [len(nltk.word_tokenize(clean_text(r["text"]))) for r in rows]
    dataset_epsilon = mean(word_counts)

    print(f"\n[{method}] Processing {filename} ({total} rows)...", flush=True)
    print(f"  Dataset epsilon (avg NLTK token count): {dataset_epsilon:.1f}", flush=True)

    if method == "SanText":
        sim_matrix = sim_matrix_santext
        id2word = {v: k for k, v in word2id.items()}
    else:
        sim_matrix = sim_matrix_plus

    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            text = clean_text(row.get("text", ""))
            nltk_count = max(1, len(nltk.word_tokenize(text)))
            eps = dataset_epsilon / nltk_count

            doc_tokens = [t.text for t in tokenizer(text)]

            try:
                if method == "SanText":
                    privatized = sanitize_doc_santext(
                        doc_tokens, word2id, sim_matrix, eps, id2word, all_words)
                else:
                    privatized = sanitize_doc_santext_plus(
                        doc_tokens, word2id, sword2id, id2sword,
                        sim_matrix, eps, all_words, P_NON_SENSITIVE)
            except Exception as e:
                print(f"  [WARN] Row {i} failed: {e}", file=sys.stderr, flush=True)
                privatized = ""
                errors += 1

            writer.writerow({"id": row["id"], "text": privatized})

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/{total} done", flush=True)

    print(f"  Saved to {output_path} ({errors} errors)", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Run SanText / SanText+ privatization")
    parser.add_argument("--method", choices=["SanText", "SanText_plus", "both"],
                        default="both", help="Which variant to run (default: both)")
    parser.add_argument("--dataset", type=str, default=None,
                        help="Single dataset filename (e.g. imdb.csv)")
    parser.add_argument("--seed", type=int, default=SEED, help="Random seed")
    parser.add_argument("--input-dir", type=str, default=None,
                        help="Directory containing input CSVs (default: ~/)")
    parser.add_argument("--output-dir", type=str, default=None,
                        help="Output directory (default: ~/santext_output/)")
    parser.add_argument("--glove-path", type=str, default=None,
                        help="Path to GloVe embeddings file (default: ~/SanText/data/glove.840B.300d.txt)")
    args = parser.parse_args()

    # Override global paths if CLI flags provided
    global INPUT_DIR, OUTPUT_DIR, GLOVE_PATH
    if args.input_dir:
        INPUT_DIR = Path(args.input_dir)
    if args.output_dir:
        OUTPUT_DIR = Path(args.output_dir)
    if args.glove_path:
        GLOVE_PATH = Path(args.glove_path)

    np.random.seed(args.seed)

    if not GLOVE_PATH.exists():
        print(f"ERROR: GloVe file not found at {GLOVE_PATH}")
        print("  Download: wget https://nlp.stanford.edu/data/glove.840B.300d.zip")
        sys.exit(1)

    datasets = [args.dataset] if args.dataset else DATASETS
    methods = ["SanText", "SanText_plus"] if args.method == "both" else [args.method]

    tokenizer = English()

    # Build vocab from all datasets
    print("Building vocabulary from datasets...", flush=True)
    vocab = build_vocab(datasets, tokenizer)
    print(f"  Vocabulary size: {len(vocab)} unique words", flush=True)

    # Load GloVe embeddings for vocab words
    word2id, all_word_embed = load_glove(vocab)
    all_words = list(word2id.keys())

    # Identify sensitive words for SanText+
    sensitive_word_count = int(SENSITIVE_WORD_PERCENTAGE * len(vocab))
    words_by_freq = [w for w, _ in vocab.most_common()]
    # Sensitive = least frequent words (bottom N%) — matches original SanText repo
    sensitive_words_set = set(words_by_freq[-sensitive_word_count - 1:])

    sword2id: dict[str, int] = {}
    sensitive_embeds: list[np.ndarray] = []
    for word, idx in word2id.items():
        if word in sensitive_words_set:
            sword2id[word] = len(sensitive_embeds)
            sensitive_embeds.append(all_word_embed[idx])

    sensitive_word_embed = np.array(sensitive_embeds, dtype="f") if sensitive_embeds else None
    id2sword = {v: k for k, v in sword2id.items()}

    print(f"  All words with embeddings: {len(word2id)}", flush=True)
    print(f"  Sensitive words with embeddings: {len(sword2id)}", flush=True)

    # Precompute distance matrices ONCE (epsilon-independent)
    # sim_matrix = -euclidean_distance; softmax applied per-word in sanitize functions
    print("Computing distance matrices...", flush=True)

    sim_matrix_santext = None
    sim_matrix_plus = None

    if "SanText" in methods:
        print("  SanText: all_words × all_words ...", flush=True)
        sim_matrix_santext = -euclidean_distances(all_word_embed, all_word_embed)
        print(f"  SanText sim_matrix: {sim_matrix_santext.shape}", flush=True)

    if "SanText_plus" in methods:
        print("  SanText+: all_words × sensitive_words ...", flush=True)
        sim_matrix_plus = -euclidean_distances(all_word_embed, sensitive_word_embed)
        print(f"  SanText+ sim_matrix: {sim_matrix_plus.shape}", flush=True)

    start = time.time()

    for method in methods:
        for dataset in datasets:
            process_dataset(
                dataset, method, tokenizer,
                word2id, sim_matrix_santext,
                sword2id, id2sword,
                sim_matrix_plus,
                all_words,
            )

    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
