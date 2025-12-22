"""
Stable-ish MAUVE smoke test for macOS (Apple Silicon friendly settings).

Run from project root:
    python -m modules.test_mauve_stable

What this script does:
- Uses enough samples to avoid MAUVE's tiny-sample clustering weirdness.
- Forces CPU (device_id=-1).
- Keeps k-means cheap (few iterations, few redos).
- Sets env vars to reduce tokenizer fork warnings / thread weirdness.
"""

import os

# Reduce common macOS + tokenizers pain
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")

import random
import platform
import sys

from modules.Mauve import Mauve


def make_corpus(topic: str, n: int) -> list[str]:
    # Simple templated corpus so you can scale n up/down quickly
    templates = {
        "health": [
            "The patient was diagnosed with {cond} in {year}.",
            "A clinician recommended {treat} after reviewing the lab results.",
            "The hospital scheduled a follow-up appointment for next month.",
            "Symptoms included {symptom} and fatigue over several weeks.",
        ],
        "finance": [
            "The stock market closed {dir} after a volatile trading session.",
            "Analysts discussed quarterly earnings and revenue projections.",
            "Investors reacted to interest rate news from the central bank.",
            "The company announced a merger and issued new guidance.",
        ],
        "random": [
            "xkqv zmnqp lskdj qweoi zxcmn asdlfk jqweoi",
            "123 4567 89 10 11 12 13 14 15",
            "!!! ??? *** --- ___ +++ ===",
        ],
    }

    conds = ["diabetes", "hypertension", "asthma", "migraine"]
    treats = ["diet changes", "physical therapy", "medication", "rest"]
    symptoms = ["headache", "nausea", "shortness of breath", "dizziness"]
    years = list(range(1995, 2025))
    dirs = ["higher", "lower", "flat"]

    out = []
    for _ in range(n):
        t = random.choice(templates[topic])
        out.append(
            t.format(
                cond=random.choice(conds),
                treat=random.choice(treats),
                symptom=random.choice(symptoms),
                year=random.choice(years),
                dir=random.choice(dirs),
            )
        )
    return out


def run_case(name: str, original: list[str], private: list[str]) -> None:
    print(f"\n=== {name} ===")
    print(f"- #original: {len(original)}  #private: {len(private)}")

    # IMPORTANT:
    # - num_buckets controls the quantization granularity.
    #   For small tests, keep it modest to avoid long k-means / unstable clustering.
    # - kmeans_max_iter / kmeans_num_redo keep FAISS k-means from taking forever.
    mauve_benchmark = Mauve(
        featurize_model_name="gpt2",  # lighter than gpt2-large
        max_text_length=32,
        device_id=-1,                 # CPU
        num_buckets=10,               # small + stable for smoke tests
        kmeans_max_iter=50,           # faster
        kmeans_num_redo=1,            # faster
        verbose=True,
        seed=0,
        batch_size=8,
    )

    score = mauve_benchmark.score(original, private)
    print(f"- MAUVE score: {score}")


def main():
    random.seed(0)

    print("Python:", sys.version.replace("\n", " "))
    print("Platform:", platform.platform())

    # Use enough samples to avoid tiny-sample warnings and long weird clustering
    n = 200

    original = make_corpus("health", n)

    # Case A: similar-ish (health vs health, different draws)
    private_similar = make_corpus("health", n)

    # Case B: topic shift
    private_topic_shift = make_corpus("finance", n)

    # Case C: random-like strings
    private_random = make_corpus("random", n)

    run_case("Case A: similar corpora (higher expected)", original, private_similar)
    run_case("Case B: topic-shifted corpora", original, private_topic_shift)
    run_case("Case C: random / unrelated strings (lower expected)", original, private_random)


if __name__ == "__main__":
    main()