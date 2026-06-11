#!/usr/bin/env python3
"""
Prepare PrivBench source datasets.

Downloads 4 source datasets from HuggingFace, saves raw copies to data/raw/,
then produces clean 1000-sample CSVs in data/interim/ for use by modules.

Usage:
    python scripts/prepare_data.py                  # Download + build interim
    python scripts/prepare_data.py --raw-only       # Download raw only
    python scripts/prepare_data.py --interim-only   # Rebuild interim from existing raw
"""

import argparse
import ast
import unicodedata
import re
import logging
from pathlib import Path

import nltk
nltk.download("punkt_tab", quiet=True)

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

RANDOM_SEED   = 42
SAMPLE_SIZE   = 1000
MIN_WORDS     = 10
MAX_WORDS     = 500

RAW_DIR     = Path("data/raw")
INTERIM_DIR = Path("data/interim")

SOURCES = {
    "yelp": {
        "hf_dataset": "yelp_polarity",
        "hf_config":  None,
        "split":      "train",
        "text_col":   "text",
        "has_sentiment": True,
    },
    "imdb": {
        "hf_dataset": "imdb",
        "hf_config":  None,
        "split":      "train",
        "text_col":   "text",
        "has_sentiment": True,
    },
    "wikitext": {
        "hf_dataset": "wikitext",
        "hf_config":  "wikitext-103-raw-v1",
        "split":      "train",
        "text_col":   "text",
        "has_sentiment": False,
    },
    "glue": {
        "hf_dataset": "glue",
        "hf_config":  "sst2",
        "split":      "train",
        "text_col":   "sentence",
        "has_sentiment": False,
    },
    "tab": {
        "source_type": "github_json",
        "urls": [
            "https://raw.githubusercontent.com/NorskRegnesentral/text-anonymization-benchmark/master/echr_train.json",
            "https://raw.githubusercontent.com/NorskRegnesentral/text-anonymization-benchmark/master/echr_dev.json",
            "https://raw.githubusercontent.com/NorskRegnesentral/text-anonymization-benchmark/master/echr_test.json",
        ],
        "text_col":   "text",
        "has_sentiment": False,
        "truncate_words": 500,  # court cases are very long; truncate before filtering
    },
    "pubmedqa": {
        "hf_dataset":  "qiaojin/PubMedQA",
        "hf_config":   "pqa_labeled",
        "split":       "train",
        "text_col":    "context",
        "context_key": "contexts",  # df["context"] is a dict; join its "contexts" list with " "
        "has_sentiment": False,
        "hidden_cols":  ["question", "final_decision"],  # kept for utility eval, not shown to users
        "save_train":   True,
        "train_source": {  # pqa_labeled has only 1000 rows (all used as test); use pqa_artificial for training
            "hf_dataset": "qiaojin/PubMedQA",
            "hf_config":  "pqa_artificial",
            "split":      "train",
            "text_col":   "context",
            "context_key": "contexts",
            "train_cols":  ["question", "final_decision"],
        },
    },
    "reddit": {
        "source_type":   "local_csv",  # already in data/raw/reddit_raw.csv
        "text_col":      "text",
        "has_sentiment": False,
        "drop_authors":  ["AutoModerator"],
        "deduplicate":   True,
        "extra_cols":    [],
        "hidden_cols":  ["author"],  # kept for authorship inference eval
        "save_train":   True,
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    if pd.isna(text) or not isinstance(text, str):
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _load_train_source(name: str, src: dict) -> pd.DataFrame:
    """Load training data from a separate HuggingFace split/config."""
    from datasets import load_dataset
    logger.info(f"  {name}: downloading train source ({src['hf_config']})...")
    ds = load_dataset(src["hf_dataset"], src["hf_config"], split=src["split"])
    df = pd.DataFrame(ds)

    # Extract text from nested dict field if needed
    context_key = src.get("context_key")
    if context_key:
        df["text"] = df[src["text_col"]].apply(lambda x: " ".join(x[context_key]))
    else:
        if src["text_col"] != "text":
            df = df.rename(columns={src["text_col"]: "text"})

    df["text"] = df["text"].apply(normalize)
    df = df[df["text"].str.len() > 0].reset_index(drop=True)
    df["id"] = [f"{name}_train_{i}" for i in range(len(df))]

    keep = ["id", "text"] + src.get("train_cols", [])
    return df[[c for c in keep if c in df.columns]]


# ── Stages ────────────────────────────────────────────────────────────────────

def download_raw_github_json(name: str, cfg: dict) -> pd.DataFrame:
    out = RAW_DIR / f"{name}_raw.csv"
    if out.exists():
        logger.info(f"  {name}: loading cached {out}")
        return pd.read_csv(out)

    all_docs = []
    for url in cfg["urls"]:
        logger.info(f"  {name}: downloading {url} ...")
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        docs = resp.json()
        all_docs.extend(docs)

    df = pd.DataFrame(all_docs)
    df.to_csv(out, index=False)
    logger.info(f"  {name}: saved {len(df):,} rows → {out}")
    return df


def download_raw(name: str, cfg: dict) -> pd.DataFrame:
    if cfg.get("source_type") == "github_json":
        return download_raw_github_json(name, cfg)

    if cfg.get("source_type") == "local_csv":
        out = RAW_DIR / f"{name}_raw.csv"
        logger.info(f"  {name}: loading local {out}")
        return pd.read_csv(out)

    out = RAW_DIR / f"{name}_raw.csv"
    if out.exists():
        logger.info(f"  {name}: loading cached {out}")
        return pd.read_csv(out)

    from datasets import load_dataset
    logger.info(f"  {name}: downloading from HuggingFace ({cfg['hf_dataset']})...")
    if cfg["hf_config"]:
        ds = load_dataset(cfg["hf_dataset"], cfg["hf_config"], split=cfg["split"])
    else:
        ds = load_dataset(cfg["hf_dataset"], split=cfg["split"])

    df = pd.DataFrame(ds)
    df.to_csv(out, index=False)
    logger.info(f"  {name}: saved {len(df):,} rows → {out}")
    return df


def build_interim(name: str, cfg: dict) -> None:
    out = INTERIM_DIR / f"{name}.csv"

    # Load raw
    raw_path = RAW_DIR / f"{name}_raw.csv"
    df = pd.read_csv(raw_path)

    # Drop unwanted authors (e.g. bots)
    if "drop_authors" in cfg and "author" in df.columns:
        df = df[~df["author"].isin(cfg["drop_authors"])].reset_index(drop=True)

    # Deduplicate on text
    if cfg.get("deduplicate"):
        df = df.drop_duplicates(subset="text").reset_index(drop=True)

    # Extract text column (handle nested dict fields if context_key is set)
    context_key = cfg.get("context_key")
    if context_key:
        df["text"] = df[cfg["text_col"]].apply(lambda x: " ".join(ast.literal_eval(x)[context_key]))
    else:
        if cfg["text_col"] != "text":
            df = df.rename(columns={cfg["text_col"]: "text"})

    # Normalize
    df["text"] = df["text"].apply(normalize)
    df = df[df["text"].str.len() > 0].reset_index(drop=True)

    # Truncate to first N words by sentence boundary if configured (before word-count filter)
    truncate = cfg.get("truncate_words")
    if truncate:
        def truncate_by_sentence(text: str) -> str:
            sentences = nltk.sent_tokenize(text)
            kept, wc = [], 0
            for sent in sentences:
                sw = len(sent.split())
                if wc + sw > truncate:
                    break
                kept.append(sent)
                wc += sw
            return " ".join(kept) if kept else text
        df["text"] = df["text"].apply(truncate_by_sentence)

    # Filter by word count
    df["wc"] = df["text"].str.split().str.len()
    before = len(df)
    df = df[(df["wc"] >= MIN_WORDS) & (df["wc"] <= MAX_WORDS)].reset_index(drop=True)
    logger.info(f"  {name}: {before:,} → {len(df):,} rows after filtering")

    # Add id
    df["id"] = [f"{name}_{i}" for i in range(len(df))]

    # Map sentiment from label if available
    if cfg["has_sentiment"] and "label" in df.columns:
        df["sentiment"] = df["label"].astype(int).map({0: "negative", 1: "positive"})
        keep_cols = ["id", "text", "sentiment"]
    else:
        keep_cols = ["id", "text"]

    # Append any extra columns to preserve (e.g. author_id)
    for col in cfg.get("extra_cols", []):
        if col in df.columns:
            keep_cols.append(col)

    # Sample (cap at available rows for small datasets)
    n = min(SAMPLE_SIZE, len(df))
    sampled_idx = df.sample(n=n, random_state=RANDOM_SEED).index
    sampled = df.loc[sampled_idx, keep_cols].reset_index(drop=True)
    sampled.to_csv(out, index=False)
    logger.info(f"  {name}: saved {len(sampled)} samples → {out}")

    # Save hidden labels for the test set (same rows as main CSV, extra columns)
    hidden_cols = cfg.get("hidden_cols", [])
    hidden_cols = [c for c in hidden_cols if c in df.columns]
    if hidden_cols:
        hidden = df.loc[sampled_idx, ["id"] + hidden_cols].reset_index(drop=True)
        hidden_path = INTERIM_DIR / f"{name}_hidden.csv"
        hidden.to_csv(hidden_path, index=False)
        logger.info(f"  {name}: saved {len(hidden)} hidden labels → {hidden_path}")

    # Save train set (rows NOT in the test sample, or from a separate source)
    if cfg.get("save_train"):
        train_path = INTERIM_DIR / f"{name}_train.csv"
        train_src = cfg.get("train_source")
        if train_src:
            # Load training data from a different HF split/config
            train_df = _load_train_source(name, train_src)
            train_df.to_csv(train_path, index=False)
            logger.info(f"  {name}: saved {len(train_df)} train rows → {train_path}")
        else:
            train_idx = df.index.difference(sampled_idx)
            train_cols = ["id", "text"] + hidden_cols
            train = df.loc[train_idx, train_cols].reset_index(drop=True)
            train.to_csv(train_path, index=False)
            logger.info(f"  {name}: saved {len(train)} train rows → {train_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Prepare PrivBench source datasets.")
    parser.add_argument("--raw-only",     action="store_true", help="Download raw files only")
    parser.add_argument("--interim-only", action="store_true", help="Rebuild interim from existing raw")
    parser.add_argument("--force",        action="store_true", help="Re-download even if raw files exist")
    parser.add_argument("--dataset",      nargs="+", choices=list(SOURCES.keys()),
                        help="Process only these datasets (default: all)")
    args = parser.parse_args()

    selected = {name: SOURCES[name] for name in (args.dataset or SOURCES.keys())}

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    # Stage 1: Download raw
    if not args.interim_only:
        logger.info("── Downloading raw datasets ──────────────────────────")
        if args.force:
            for name in selected:
                raw = RAW_DIR / f"{name}_raw.csv"
                if raw.exists():
                    raw.unlink()
        for name, cfg in selected.items():
            download_raw(name, cfg)

    # Stage 2: Build interim
    if not args.raw_only:
        logger.info("\n── Building interim datasets ─────────────────────────")
        for name, cfg in selected.items():
            raw_path = RAW_DIR / f"{name}_raw.csv"
            if not raw_path.exists():
                logger.error(f"  {name}: raw file not found, run without --interim-only first")
                continue
            build_interim(name, cfg)

    logger.info("\n── Done ──────────────────────────────────────────────")


if __name__ == "__main__":
    main()
