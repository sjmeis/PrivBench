"""
Run CusText / CusText+ word-level differential privacy on the benchmark datasets.

CusText (Findings of ACL 2023) differs from SanText by restricting each word's
output set to its top-K nearest neighbours in embedding space, rather than
sampling from the full vocabulary. Within that neighbourhood the exponential
mechanism is applied over *normalised* distances, giving better semantic
utility at the same privacy budget.

CusText+: same as CusText but stopwords are kept unchanged (not privatised).

Reference: "A Customized Text Sanitization Mechanism with Differential Privacy"
           Chen et al., Findings of ACL 2023.
           https://github.com/sai4july/CusText

Privacy budget (same convention as SanText / Diffractor):
    dataset_epsilon = mean(nltk_token_count) across all 1000 docs
    eps_per_token   = dataset_epsilon / nltk_token_count(doc)
    total doc budget = eps_per_token × N_tokens = dataset_epsilon  (basic composition)

Performance: the top-K neighbour lists and normalised distances are computed once
per vocab word in batches (O(V × top_k) memory, much cheaper than the full V×V
matrix used by SanText). Per-token softmax is applied at runtime using the
per-document epsilon value.

Usage (on server, inside ~/dpmlm_venv or any venv with the prerequisites):
    python3 ~/run_custext.py                            # both variants, all datasets
    python3 ~/run_custext.py --method CusText           # CusText only
    python3 ~/run_custext.py --method CusText_plus      # CusText+ only
    python3 ~/run_custext.py --dataset imdb.csv         # single dataset

Prerequisites:
    - GloVe embeddings at ~/SanText/data/glove.840B.300d.txt
      (shared with run_santext.py; download once)
      wget https://nlp.stanford.edu/data/glove.840B.300d.zip
    - pip install scipy scikit-learn spacy nltk numpy tqdm
    - python -m spacy download en_core_web_sm   # (only needed for tokenization)
"""

import argparse
import csv
import re
import sys
import time
import unicodedata
from collections import Counter
from pathlib import Path
from statistics import mean

import nltk
nltk.download("punkt_tab", quiet=True)
nltk.download("stopwords", quiet=True)

import numpy as np
from scipy.special import softmax
from sklearn.metrics.pairwise import euclidean_distances
from tqdm import tqdm

from spacy.lang.en import English

# ---------------------------------------------------------------------------
# Paths and hyper-parameters
# ---------------------------------------------------------------------------
GLOVE_PATH = Path.home() / "SanText" / "data" / "glove.840B.300d.txt"
INPUT_DIR  = Path.home()
OUTPUT_DIR = Path.home() / "custext_output"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
]

# Number of nearest neighbours that form the output set for each word.
# Paper default is 20; higher values = more utility but looser privacy.
TOP_K = 20

# Batch size for pairwise distance computation (trades RAM vs speed).
EMBED_BATCH = 512

SEED = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_text(text: str) -> str:
    """Strip HTML tags and normalise whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def word_normalize(word: str) -> str:
    """Unicode NFD normalization (matches GloVe key convention)."""
    return unicodedata.normalize("NFD", word)


# ---------------------------------------------------------------------------
# Vocab building
# ---------------------------------------------------------------------------
def build_vocab(filenames: list[str], tokenizer) -> Counter:
    """Build a word-frequency Counter from the text columns of all datasets."""
    vocab: Counter = Counter()
    for fname in filenames:
        path = INPUT_DIR / fname
        if not path.exists():
            print(f"  [WARN] {path} not found, skipping", flush=True)
            continue
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                vocab.update(t.text for t in tokenizer(clean_text(row.get("text", ""))))
    return vocab


# ---------------------------------------------------------------------------
# GloVe loading
# ---------------------------------------------------------------------------
def load_glove(vocab: Counter) -> tuple[dict, np.ndarray]:
    """Load GloVe vectors filtered to words in vocab."""
    word2id: dict[str, int] = {}
    embeddings: list[list[float]] = []

    print(f"Loading GloVe from {GLOVE_PATH} ...", flush=True)
    num_lines = sum(1 for _ in open(GLOVE_PATH, encoding="utf-8"))

    with open(GLOVE_PATH, encoding="utf-8") as f:
        first = f.readline().rstrip().split(" ")
        if len(first) != 2:   # no header line → rewind
            f.seek(0)
        for row in tqdm(f, total=num_lines - 1, desc="Loading GloVe"):
            parts = row.rstrip().split(" ")
            word = word_normalize(parts[0])
            if word in vocab and word not in word2id:
                word2id[word] = len(embeddings)
                embeddings.append([float(x) for x in parts[1:]])

    emb_matrix = np.array(embeddings, dtype=np.float32)
    print(f"  Loaded {len(word2id)} vectors ({emb_matrix.shape})", flush=True)
    return word2id, emb_matrix


# ---------------------------------------------------------------------------
# CusText mapping: top-K neighbours + normalised distances
# ---------------------------------------------------------------------------
def build_custext_mapping(
    word2id: dict, emb_matrix: np.ndarray, top_k: int
) -> tuple[dict, dict]:
    """
    For each vocab word, find its top-K nearest neighbours (by Euclidean distance)
    and store the normalised distances used by the exponential mechanism.

    Returns:
        sim_word_dict : word -> list of top-K neighbour words (closest first)
        norm_dist_dict: word -> np.ndarray of normalised distances, shape (top_k,)
                        Values in [-1, 0]: 0 = closest neighbour, -1 = furthest.
                        (normalisation matches the CusText paper / repo)
    """
    all_words = list(word2id.keys())
    V = len(all_words)

    sim_word_dict:  dict[str, list[str]]   = {}
    norm_dist_dict: dict[str, np.ndarray]  = {}

    print(f"Building CusText top-{top_k} neighbour mapping (V={V}) ...", flush=True)

    for batch_start in tqdm(range(0, V, EMBED_BATCH), desc="Neighbours"):
        batch_end = min(batch_start + EMBED_BATCH, V)
        batch_emb = emb_matrix[batch_start:batch_end]           # (B, D)
        dists = euclidean_distances(batch_emb, emb_matrix)      # (B, V)  euclidean

        for local_i in range(batch_end - batch_start):
            global_i = batch_start + local_i
            word = all_words[global_i]
            dist_row = dists[local_i]

            # Exclude the word itself; find top_k closest
            dist_row[global_i] = np.inf
            neighbor_idx = np.argpartition(dist_row, top_k)[:top_k]
            neighbor_idx = neighbor_idx[np.argsort(dist_row[neighbor_idx])]  # sort asc

            neighbor_dists = dist_row[neighbor_idx]   # ascending order

            # Normalise to [-1, 0]: closest -> 0, furthest in set -> -1
            d_min, d_max = neighbor_dists[0], neighbor_dists[-1]
            if d_max > d_min:
                norm = -(neighbor_dists - d_min) / (d_max - d_min)
            else:
                norm = np.zeros(top_k, dtype=np.float32)

            sim_word_dict[word]  = [all_words[j] for j in neighbor_idx]
            norm_dist_dict[word] = norm.astype(np.float32)

    return sim_word_dict, norm_dist_dict


# ---------------------------------------------------------------------------
# Per-document privatisation
# ---------------------------------------------------------------------------
def _sample_replacement(norm_dists: np.ndarray, epsilon: float) -> int:
    """Sample a neighbour index using the exponential mechanism."""
    logits = epsilon * norm_dists / 2
    probs  = softmax(logits)
    return int(np.random.choice(len(probs), p=probs))


def privatize_doc_custext(
    tokens: list[str],
    word2id: dict,
    sim_word_dict: dict,
    norm_dist_dict: dict,
    epsilon: float,
    stopwords_set: set | None,
) -> str:
    """Replace each token using the CusText exponential mechanism.

    If stopwords_set is provided (CusText+), stop-words are kept unchanged.
    Out-of-vocabulary tokens are kept unchanged.
    """
    new_tokens = []
    for tok in tokens:
        nw = word_normalize(tok)

        # CusText+: skip stopwords
        if stopwords_set is not None and nw.lower() in stopwords_set:
            new_tokens.append(tok)
            continue

        if nw in sim_word_dict:
            idx = _sample_replacement(norm_dist_dict[nw], epsilon)
            new_tokens.append(sim_word_dict[nw][idx])
        else:
            # OOV: keep original (matches most conservative reading of the paper)
            new_tokens.append(tok)

    return " ".join(new_tokens)


# ---------------------------------------------------------------------------
# Dataset processing
# ---------------------------------------------------------------------------
def process_dataset(
    filename: str,
    method: str,
    tokenizer,
    word2id: dict,
    sim_word_dict: dict,
    norm_dist_dict: dict,
    stopwords_set: set | None,
):
    suffix = "_custext" if method == "CusText" else "_custext_plus"
    input_path  = INPUT_DIR  / filename
    output_path = OUTPUT_DIR / filename.replace(".csv", f"{suffix}.csv")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader    = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows       = list(reader)

    total = len(rows)

    # Dataset-level epsilon = average NLTK token count (same convention as SanText)
    word_counts     = [len(nltk.word_tokenize(clean_text(r["text"]))) for r in rows]
    dataset_epsilon = mean(word_counts)

    sw = stopwords_set if method == "CusText_plus" else None

    print(f"\n[{method}] Processing {filename} ({total} rows)...", flush=True)
    print(f"  Dataset epsilon: {dataset_epsilon:.1f}", flush=True)

    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            text       = clean_text(row.get("text", ""))
            nltk_count = max(1, len(nltk.word_tokenize(text)))
            eps        = dataset_epsilon / nltk_count

            doc_tokens = [t.text for t in tokenizer(text)]

            try:
                privatized = privatize_doc_custext(
                    doc_tokens, word2id, sim_word_dict, norm_dist_dict, eps, sw
                )
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
    parser = argparse.ArgumentParser(
        description="Run CusText / CusText+ word-level DP privatization"
    )
    parser.add_argument(
        "--method",
        choices=["CusText", "CusText_plus", "both"],
        default="both",
        help="Variant to run (default: both)",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Single dataset filename (e.g. imdb.csv). Default: all datasets.",
    )
    parser.add_argument(
        "--top_k",
        type=int,
        default=TOP_K,
        help=f"Output-set size per word (default: {TOP_K})",
    )
    parser.add_argument("--seed", type=int, default=SEED, help="Random seed")
    args = parser.parse_args()

    np.random.seed(args.seed)

    if not GLOVE_PATH.exists():
        print(f"ERROR: GloVe file not found at {GLOVE_PATH}")
        print("  wget https://nlp.stanford.edu/data/glove.840B.300d.zip")
        sys.exit(1)

    datasets = [args.dataset] if args.dataset else DATASETS
    methods  = ["CusText", "CusText_plus"] if args.method == "both" else [args.method]

    tokenizer = English()

    # Build vocab from all target datasets
    print("Building vocabulary...", flush=True)
    vocab = build_vocab(datasets, tokenizer)
    print(f"  {len(vocab)} unique tokens", flush=True)

    # Load GloVe embeddings filtered to vocab
    word2id, emb_matrix = load_glove(vocab)

    # Build CusText neighbour mapping (epsilon-independent)
    sim_word_dict, norm_dist_dict = build_custext_mapping(
        word2id, emb_matrix, args.top_k
    )

    # NLTK stopwords for CusText+
    from nltk.corpus import stopwords as nltk_sw
    stopwords_set = set(nltk_sw.words("english"))

    start = time.time()

    for method in methods:
        for dataset in datasets:
            process_dataset(
                dataset, method, tokenizer,
                word2id, sim_word_dict, norm_dist_dict, stopwords_set,
            )

    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
