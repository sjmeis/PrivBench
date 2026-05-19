"""
Run Aug-PE (Augmented Private Evolution, ICML 2024) on the benchmark datasets.

Aug-PE generates differentially private synthetic text. It does NOT privatize
individual documents — it generates entirely new synthetic samples that satisfy
(epsilon, delta)-DP with respect to the original dataset. Synthetic samples are
assigned to CSV rows in order (no 1-to-1 correspondence with originals).

Algorithm:
  1. Generate N initial seed samples via LLM
  2. For T epochs:
     a. Generate L variations per sample -> L*N candidates
     b. Embed all candidates via sentence-transformer
     c. DP nearest-neighbor histogram: private data votes for nearest candidate,
        add Gaussian noise, select top-N by noisy vote count
  3. Output: N synthetic samples assigned to CSV rows in order

Privacy budget:
  dataset_epsilon = mean(NLTK token count) across all docs (same as other methods)
  delta = 1 / (N * log(N))
  sigma = solve for noise_multiplier given epsilon, delta, T epochs
  (Gaussian mechanism accounting from Aug-PE's dp_budget.ipynb)

Original paper: https://github.com/AI-secure/aug-pe

Usage (on server, inside ~/rupta_venv):
    # Process all datasets sequentially:
    python3 ~/run_aug_pe.py

    # Process a single dataset:
    python3 ~/run_aug_pe.py --dataset imdb.csv

    # Customize parameters:
    python3 ~/run_aug_pe.py --dataset glue.csv --epochs 10 --variations 4

Prerequisites:
    - Virtual environment with vLLM, sentence-transformers, scipy, nltk:
      source ~/rupta_venv/bin/activate
      pip install sentence-transformers scipy
    - Qwen model auto-downloads from HuggingFace on first run (~4.5 GB, already cached)
    - Embedding model auto-downloads (~420 MB)
"""

import argparse
import csv
import math
import re
import sys
import time
from pathlib import Path
from statistics import mean

import numpy as np
import scipy.optimize
import scipy.stats
from sklearn.neighbors import NearestNeighbors

import nltk
nltk.download("punkt_tab", quiet=True)

INPUT_DIR = Path.home()
OUTPUT_DIR = Path.home() / "aug_pe_output"

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4"
EMBED_MODEL = "all-mpnet-base-v2"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

DEFAULT_EPOCHS = 10
DEFAULT_VARIATIONS = 4
DEFAULT_K = 1
DEFAULT_THRESHOLD = 0.0
SEED = 42

# ── Prompts ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a helpful writing assistant. Follow the instructions exactly. "
    "Return ONLY the requested text, nothing else."
)

SEED_PROMPTS = {
    "glue.csv": [
        "Write a short, single-sentence movie review expressing a clear opinion.",
        "Write a brief film critique in one sentence.",
    ],
    "imdb.csv": [
        ("Write a detailed positive movie review (2-3 paragraphs) discussing "
         "plot, acting, and your overall impression."),
        ("Write a detailed negative movie review (2-3 paragraphs) discussing "
         "what didn't work about the film."),
    ],
    "wikitext.csv": [
        ("Write a Wikipedia-style encyclopedic paragraph about a topic. Use a "
         "neutral, factual tone with specific details."),
        ("Write an informative encyclopedia article paragraph covering a notable "
         "subject with dates and facts."),
    ],
    "yelp.csv": [
        ("Write a positive restaurant or business review (1-2 paragraphs) "
         "describing your experience."),
        ("Write a negative restaurant or business review (1-2 paragraphs) "
         "describing what went wrong."),
    ],
}

VARIATION_PROMPT = (
    "Rephrase the following text while preserving its meaning and approximate "
    "length. Use a different writing style and word choices.\n\n"
    "Original: {text}\n\n"
    "Rephrased:"
)


# ── Privacy accounting (from Aug-PE's dp_budget.ipynb) ───────────────────

def delta_gaussian(eps: float, mu: float) -> float:
    """Compute delta of Gaussian mechanism with shift mu."""
    if mu == 0:
        return 0.0
    return (scipy.stats.norm.cdf(-eps / mu + mu / 2)
            - np.exp(eps) * scipy.stats.norm.cdf(-eps / mu - mu / 2))


def eps_gaussian(delta: float, mu: float) -> float:
    """Compute epsilon of Gaussian mechanism with shift mu."""
    if mu == 0:
        return 0.0
    # For very large mu the epsilon can be huge; find a valid upper bracket
    def f(x):
        return delta_gaussian(x, mu) - delta
    # Expand upper bracket until f changes sign (or give up)
    upper = 500.0
    while upper < 1e8:
        if f(upper) < 0:
            break
        upper *= 10
    else:
        return float("inf")
    return scipy.optimize.root_scalar(f, bracket=[0, upper], method="brentq").root


def compute_epsilon(noise_multiplier: float, num_steps: int,
                    delta: float) -> float:
    """Compute epsilon given noise_multiplier, T steps, and delta."""
    return eps_gaussian(delta, np.sqrt(num_steps) / noise_multiplier)


def solve_sigma(target_epsilon: float, num_steps: int, delta: float,
                sigma_low: float = 0.001, sigma_high: float = 1000.0) -> float:
    """Find noise_multiplier (sigma) that achieves target epsilon."""
    def f(sigma):
        eps = compute_epsilon(sigma, num_steps, delta)
        if eps == float("inf"):
            return float("inf")
        return eps - target_epsilon

    # Try f at boundaries; handle infinite epsilon for tiny sigma
    try:
        f_low = f(sigma_low)
    except (ValueError, OverflowError):
        f_low = float("inf")
    if f_low <= 0:
        return sigma_low

    try:
        f_high = f(sigma_high)
    except (ValueError, OverflowError):
        f_high = -1.0
    if f_high > 0:
        print(f"  [WARN] Cannot achieve epsilon={target_epsilon} with "
              f"sigma<={sigma_high}", flush=True)
        return sigma_high

    return scipy.optimize.root_scalar(
        f, bracket=[sigma_low, sigma_high], method="brentq"
    ).root


# ── DP nearest-neighbor histogram (from Aug-PE's dp_counter.py) ─────────

def dp_nn_histogram(candidate_embeddings, private_embeddings,
                    noise_multiplier, k=1, threshold=0.0):
    """Compute DP nearest-neighbor histogram.

    Each private sample votes for its k nearest candidates. Gaussian noise
    is added to the vote counts.

    Returns:
        noisy_counts, clean_counts — both (M,) arrays
    """
    num_candidates = candidate_embeddings.shape[0]

    nn = NearestNeighbors(n_neighbors=k, metric="euclidean", algorithm="auto")
    nn.fit(candidate_embeddings)
    _, indices = nn.kneighbors(private_embeddings)

    clean_counts = np.zeros(num_candidates)
    for idx in indices.flatten():
        clean_counts[idx] += 1

    noisy_counts = clean_counts.copy()
    noisy_counts += (np.random.normal(size=num_candidates)
                     * np.sqrt(k) * noise_multiplier)

    noisy_counts = np.clip(noisy_counts, a_min=threshold, a_max=None)
    noisy_counts = noisy_counts - threshold

    return noisy_counts, clean_counts


# ── Helpers ──────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Strip HTML tags and normalise whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def build_chat_prompt(tokenizer, system: str, user: str) -> str:
    """Format a system+user message pair using the model's chat template."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )


def compute_embeddings(embed_model, texts, batch_size=128):
    """Compute L2-normalised sentence embeddings on CPU."""
    return embed_model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)


def batched_generate(llm, prompts, sampling_params, batch_size=2000):
    """Generate in chunks to avoid prompt-side OOM."""
    if len(prompts) <= batch_size:
        return llm.generate(prompts, sampling_params)
    results = []
    for i in range(0, len(prompts), batch_size):
        results.extend(llm.generate(prompts[i:i + batch_size], sampling_params))
    return results


# ── Core pipeline ────────────────────────────────────────────────────────

def generate_seeds(llm, tokenizer, sampling_params, dataset, num_samples):
    """Generate initial seed synthetic samples."""
    templates = SEED_PROMPTS[dataset]
    prompts = [
        build_chat_prompt(tokenizer, SYSTEM_PROMPT,
                          templates[i % len(templates)])
        for i in range(num_samples)
    ]
    outputs = batched_generate(llm, prompts, sampling_params)
    return [o.outputs[0].text.strip() for o in outputs]


def generate_variations(llm, tokenizer, sampling_params, texts, L):
    """Generate L variations for each text. Returns flat list of len(texts)*L."""
    prompts = []
    for text in texts:
        for _ in range(L):
            user_msg = VARIATION_PROMPT.format(text=text[:2000])
            prompts.append(
                build_chat_prompt(tokenizer, SYSTEM_PROMPT, user_msg)
            )
    outputs = batched_generate(llm, prompts, sampling_params)
    return [o.outputs[0].text.strip() for o in outputs]


def process_dataset(filename, llm, tokenizer, embed_model,
                    sp_seed, sp_var,
                    epochs=10, L=4, k=1, threshold=0.0,
                    epsilon_override=None):
    """Run Aug-PE on a single dataset."""
    input_path = INPUT_DIR / filename
    output_path = OUTPUT_DIR / filename.replace(".csv", "_aug_pe.csv")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Read input ───────────────────────────────────────────────────
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    N = len(rows)

    # Skip if already completed
    if output_path.exists():
        with open(output_path, newline="", encoding="utf-8") as f:
            output_rows = sum(1 for _ in f) - 1
        if output_rows >= N:
            print(f"\nSkipping {filename} (already complete: {output_rows} rows)",
                  flush=True)
            return

    # ── Compute privacy parameters ───────────────────────────────────
    texts = [clean_text(row.get("text", "")) for row in rows]
    if epsilon_override is not None:
        dataset_epsilon = epsilon_override
    else:
        word_counts = [len(nltk.word_tokenize(t)) for t in texts]
        dataset_epsilon = mean(word_counts)

    delta = 1.0 / (N * math.log(N))
    sigma = solve_sigma(dataset_epsilon, epochs, delta)
    verified_eps = compute_epsilon(sigma, epochs, delta)

    print(f"\n{'=' * 60}", flush=True)
    print(f"Processing {filename} ({N} rows)", flush=True)
    print(f"  Dataset epsilon: {dataset_epsilon:.1f}", flush=True)
    print(f"  Delta: {delta:.6e}", flush=True)
    print(f"  Sigma (noise_multiplier): {sigma:.6f}", flush=True)
    print(f"  Verified epsilon: {verified_eps:.2f}", flush=True)
    print(f"  Epochs: {epochs}, Variations/sample: {L}, k-NN: {k}", flush=True)
    print(f"{'=' * 60}", flush=True)

    # ── Step 1: Private data embeddings ──────────────────────────────
    print("  Computing private data embeddings...", flush=True)
    t0 = time.time()
    private_embs = compute_embeddings(embed_model, texts)
    print(f"    Done in {time.time() - t0:.1f}s, shape={private_embs.shape}",
          flush=True)

    # ── Step 2: Seed generation ──────────────────────────────────────
    print(f"  Generating {N} seed samples...", flush=True)
    t0 = time.time()
    syn_samples = generate_seeds(llm, tokenizer, sp_seed, filename, N)
    empty_seeds = sum(1 for s in syn_samples if not s)
    print(f"    Done in {time.time() - t0:.1f}s ({empty_seeds} empty)", flush=True)

    # Replace empty seeds with a fallback
    for i in range(len(syn_samples)):
        if not syn_samples[i]:
            syn_samples[i] = "This is a placeholder text."

    # ── Step 3: Iterative private evolution ──────────────────────────
    for epoch in range(epochs):
        epoch_start = time.time()
        print(f"\n  Epoch {epoch + 1}/{epochs}:", flush=True)

        # 3a. Generate L variations per sample
        print(f"    Generating {L}x{N} = {L * N} variations...", flush=True)
        t0 = time.time()
        candidates = generate_variations(llm, tokenizer, sp_var, syn_samples, L)
        print(f"      Done in {time.time() - t0:.1f}s", flush=True)

        # Replace empty variations with parent text
        empty_vars = 0
        for i, v in enumerate(candidates):
            if not v:
                candidates[i] = syn_samples[i // L]
                empty_vars += 1
        if empty_vars:
            print(f"      {empty_vars} empty variations replaced", flush=True)

        # 3b. Compute candidate embeddings
        print(f"    Computing embeddings for {len(candidates)} candidates...",
              flush=True)
        t0 = time.time()
        cand_embs = compute_embeddings(embed_model, candidates)
        print(f"      Done in {time.time() - t0:.1f}s", flush=True)

        # 3c. DP nearest-neighbor histogram
        print(f"    DP-NN histogram (sigma={sigma:.6f})...", flush=True)
        noisy_counts, clean_counts = dp_nn_histogram(
            cand_embs, private_embs,
            noise_multiplier=sigma, k=k, threshold=threshold,
        )

        # 3d. Select top-N by noisy vote count (rank mode)
        top_indices = np.argsort(noisy_counts)[::-1][:N]
        syn_samples = [candidates[i] for i in top_indices]

        # Logging
        max_clean = clean_counts.max()
        voted = np.sum(clean_counts > 0)
        mean_clean = (clean_counts[clean_counts > 0].mean()
                      if voted > 0 else 0)
        sel_votes = noisy_counts[top_indices]
        print(f"      Clean votes: max={max_clean:.0f}, "
              f"mean(>0)={mean_clean:.1f}, "
              f"voted={voted}/{len(candidates)}", flush=True)
        print(f"      Selected noisy votes: "
              f"min={sel_votes.min():.2f}, max={sel_votes.max():.2f}",
              flush=True)
        print(f"    Epoch done in {time.time() - epoch_start:.1f}s", flush=True)

    # ── Step 4: Write output CSV ─────────────────────────────────────
    print(f"\n  Writing output to {output_path}...", flush=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            writer.writerow({
                "id": row["id"],
                "text": syn_samples[i] if i < len(syn_samples) else "",
            })

    empty_out = sum(1 for s in syn_samples[:N] if not s)
    print(f"  Saved {N} rows ({empty_out} empty privatized_text)", flush=True)


# ── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Aug-PE synthetic text generation"
    )
    parser.add_argument("--dataset", type=str, default=None,
                        help="Single dataset filename (e.g. imdb.csv)")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS,
                        help=f"Number of PE epochs (default: {DEFAULT_EPOCHS})")
    parser.add_argument("--variations", type=int, default=DEFAULT_VARIATIONS,
                        help=f"Variations per sample per epoch (default: "
                             f"{DEFAULT_VARIATIONS})")
    parser.add_argument("--k", type=int, default=DEFAULT_K,
                        help=f"k for k-NN histogram (default: {DEFAULT_K})")
    parser.add_argument("--epsilon", type=float, default=None,
                        help="Override dataset epsilon (skip recomputation)")
    parser.add_argument("--model", type=str, default=MODEL_NAME,
                        help=f"HuggingFace LLM name (default: {MODEL_NAME})")
    parser.add_argument("--embed-model", type=str, default=EMBED_MODEL,
                        help=f"Sentence-transformer model (default: {EMBED_MODEL})")
    parser.add_argument("--max-model-len", type=int, default=4096,
                        help="Maximum context length for vLLM (default: 4096)")
    parser.add_argument("--seed", type=int, default=SEED,
                        help=f"Random seed (default: {SEED})")
    args = parser.parse_args()

    np.random.seed(args.seed)

    from vllm import LLM, SamplingParams
    from sentence_transformers import SentenceTransformer

    # Load LLM
    print(f"Loading LLM {args.model} via vLLM...", flush=True)
    llm = LLM(
        model=args.model,
        quantization="gptq",
        max_model_len=args.max_model_len,
        gpu_memory_utilization=0.85,
        trust_remote_code=True,
    )
    tokenizer = llm.get_tokenizer()
    print("LLM loaded.", flush=True)

    # Load embedding model on CPU (avoid GPU contention with vLLM)
    print(f"Loading embedding model {args.embed_model}...", flush=True)
    embed_model = SentenceTransformer(args.embed_model, device="cpu")
    print("Embedding model loaded.", flush=True)

    sp_seed = SamplingParams(
        temperature=0.9,
        top_p=0.95,
        max_tokens=512,
        stop=["<|im_end|>", "<|endoftext|>"],
    )
    sp_var = SamplingParams(
        temperature=0.7,
        top_p=0.9,
        max_tokens=512,
        stop=["<|im_end|>", "<|endoftext|>"],
    )

    datasets = [args.dataset] if args.dataset else DATASETS

    start = time.time()
    for dataset in datasets:
        process_dataset(
            dataset, llm, tokenizer, embed_model,
            sp_seed, sp_var,
            epochs=args.epochs, L=args.variations, k=args.k,
            epsilon_override=args.epsilon,
        )

    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in ~/aug_pe_output/")
