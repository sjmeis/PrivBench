"""
Run ADePT (Auto-encoder based Differentially Private Text Transformation) on the
benchmark datasets.

ADePT (EACL 2021) encodes each document to a dense context vector via a bidirectional
LSTM autoencoder, clips the vector to a fixed L2 norm (bounding sensitivity), adds
calibrated Laplace noise, then greedily decodes back to text.

NOTE: A follow-up EMNLP 2021 paper ("When differential privacy meets NLP: The devil
is in the detail", https://aclanthology.org/2021.emnlp-main.114/) showed that
ADePT's original DP proof is flawed (incorrect sensitivity bound). Results should be
treated as approximate / heuristic privacy rather than formal DP guarantees.

There is no official standalone implementation; the trusthlt/dp-rewrite repo
(https://github.com/trusthlt/dp-rewrite) reimplements ADePT as part of a full
training framework. This script re-implements the algorithm directly, following
the architecture described in the paper and the dp-rewrite source.

Algorithm (per document):
  1. Build vocabulary from dataset text.
  2. Train a bidirectional LSTM autoencoder on the dataset text (pretrain phase).
  3. For each document:
       a. Encode tokens → context vector z  (bidirectional LSTM)
       b. Clip z to L2 norm C               (sensitivity bounding)
       c. Add Laplace noise ~ Lap(0, C/ε)  (ε-DP mechanism)
       d. Greedily decode z' → privatized text

Privacy budget (same convention as SanText / Diffractor / DP-MLM):
    dataset_epsilon = mean(nltk_token_count) over all dataset documents
    This epsilon is applied to each document's context vector.

Two-stage usage:
    # Stage 1: pretrain autoencoder on a single dataset
    python3 ~/run_adept.py --mode pretrain --dataset imdb.csv

    # Stage 2: rewrite using a saved checkpoint
    python3 ~/run_adept.py --mode rewrite --dataset imdb.csv \\
        --checkpoint ~/adept_output/checkpoints/imdb_adept.pt

    # Combined (default): pretrain then rewrite for every dataset
    python3 ~/run_adept.py
    python3 ~/run_adept.py --dataset imdb.csv

References:
    Krishna et al., EACL 2021  — https://arxiv.org/abs/2102.01502
    Habernal, EMNLP 2021       — https://aclanthology.org/2021.emnlp-main.114/
    trusthlt/dp-rewrite        — https://github.com/trusthlt/dp-rewrite

Prerequisites:
    pip install torch nltk tqdm
"""

import argparse
import csv
import re
import sys
import time
from collections import Counter
from pathlib import Path
from statistics import mean

import nltk
nltk.download("punkt_tab", quiet=True)
import numpy as np
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Paths and hyper-parameters
# ---------------------------------------------------------------------------
INPUT_DIR  = Path.home()
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "privatized" / "adept"
CKPT_DIR   = OUTPUT_DIR / "checkpoints"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

# Model architecture (matches dp-rewrite defaults)
EMBED_SIZE  = 128
HIDDEN_SIZE = 256   # bidirectional → context dim = 2 * HIDDEN_SIZE = 512
MAX_SEQ_LEN = 128   # texts are truncated to this many tokens
MAX_VOCAB   = 20_000

# Training
EPOCHS      = 50
BATCH_SIZE  = 32
LR          = 1e-3
PATIENCE    = 5     # early stopping: epochs without loss improvement

# DP mechanism
CLIPPING_CONST = 1.0   # L2 norm bound C for context vector

# Special token IDs
PAD_ID = 0
UNK_ID = 1
SOS_ID = 2
EOS_ID = 3

SEED = 42

# ---------------------------------------------------------------------------
# Text utilities
# ---------------------------------------------------------------------------
def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> list[str]:
    return nltk.word_tokenize(clean_text(text).lower())


# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------
def build_vocab(texts: list[str], max_vocab: int = MAX_VOCAB) -> tuple[dict, dict]:
    counter: Counter = Counter()
    for text in texts:
        counter.update(tokenize(text))

    specials = {"<PAD>": PAD_ID, "<UNK>": UNK_ID, "<SOS>": SOS_ID, "<EOS>": EOS_ID}
    word2id = dict(specials)
    for word, _ in counter.most_common(max_vocab - len(specials)):
        if word not in word2id:
            word2id[word] = len(word2id)
    id2word = {v: k for k, v in word2id.items()}
    return word2id, id2word


def encode_text(tokens: list[str], word2id: dict) -> list[int]:
    """Encode tokens to IDs with SOS prefix, EOS suffix, truncated to MAX_SEQ_LEN."""
    ids = [SOS_ID]
    for tok in tokens[: MAX_SEQ_LEN - 2]:
        ids.append(word2id.get(tok, UNK_ID))
    ids.append(EOS_ID)
    return ids


# ---------------------------------------------------------------------------
# PyTorch dataset / collation
# ---------------------------------------------------------------------------
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import Dataset, DataLoader
    from torch.nn.utils.rnn import pack_padded_sequence, pad_sequence
    _HAS_TORCH = True
except ImportError:
    _HAS_TORCH = False


class _TextDataset(Dataset):
    def __init__(self, texts: list[str], word2id: dict):
        self.samples = [
            torch.tensor(encode_text(tokenize(t), word2id), dtype=torch.long)
            for t in texts
        ]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return self.samples[idx]


def _collate(batch):
    lengths = torch.tensor([len(x) for x in batch])
    padded  = pad_sequence(batch, batch_first=True, padding_value=PAD_ID)
    return padded, lengths


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
class _Encoder(nn.Module):
    def __init__(self, vocab_size: int, embed_size: int, hidden_size: int):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_size, padding_idx=PAD_ID)
        self.lstm = nn.LSTM(embed_size, hidden_size, batch_first=True, bidirectional=True)

    def forward(self, x, lengths):
        emb    = self.embedding(x)
        packed = pack_padded_sequence(emb, lengths.cpu(), batch_first=True, enforce_sorted=False)
        _, (h, _) = self.lstm(packed)
        # h: (2, B, H) → cat forward + backward → (B, 2H)
        return torch.cat([h[0], h[1]], dim=-1)


class _Decoder(nn.Module):
    def __init__(self, vocab_size: int, embed_size: int, hidden_size: int):
        super().__init__()
        ctx_size = 2 * hidden_size
        self.ctx2h    = nn.Linear(ctx_size, hidden_size)
        self.ctx2c    = nn.Linear(ctx_size, hidden_size)
        self.embedding = nn.Embedding(vocab_size, embed_size, padding_idx=PAD_ID)
        self.lstm      = nn.LSTM(embed_size, hidden_size, batch_first=True)
        self.out_proj  = nn.Linear(hidden_size, vocab_size)

    def _init_hidden(self, context):
        h0 = torch.tanh(self.ctx2h(context)).unsqueeze(0)   # (1, B, H)
        c0 = torch.tanh(self.ctx2c(context)).unsqueeze(0)
        return h0, c0

    def forward(self, context, tgt_in):
        """Teacher-forcing: tgt_in is (B, T-1), returns logits (B, T-1, V)."""
        h0, c0 = self._init_hidden(context)
        emb    = self.embedding(tgt_in)
        out, _ = self.lstm(emb, (h0, c0))
        return self.out_proj(out)

    @torch.no_grad()
    def greedy_decode(self, context, max_len: int, device):
        h, c = self._init_hidden(context)
        B    = context.size(0)
        token = torch.full((B, 1), SOS_ID, dtype=torch.long, device=device)
        outputs = []
        done    = torch.zeros(B, dtype=torch.bool, device=device)

        for _ in range(max_len):
            emb       = self.embedding(token)
            out, (h, c) = self.lstm(emb, (h, c))
            pred      = self.out_proj(out.squeeze(1)).argmax(dim=-1)   # (B,)
            outputs.append(pred)
            done = done | (pred == EOS_ID)
            if done.all():
                break
            token = pred.unsqueeze(1)

        return torch.stack(outputs, dim=1)   # (B, T_out)


class ADePTModel(nn.Module):
    def __init__(self, vocab_size: int,
                 embed_size: int = EMBED_SIZE,
                 hidden_size: int = HIDDEN_SIZE):
        super().__init__()
        self.encoder = _Encoder(vocab_size, embed_size, hidden_size)
        self.decoder = _Decoder(vocab_size, embed_size, hidden_size)

    def forward(self, src, lengths, tgt_in):
        """Training forward (teacher forcing)."""
        ctx = self.encoder(src, lengths)
        return self.decoder(ctx, tgt_in)

    def privatize(self, src, lengths, epsilon: float,
                  clip_c: float = CLIPPING_CONST, device="cpu"):
        """Encode → clip → add Laplace noise → greedy decode."""
        with torch.no_grad():
            ctx = self.encoder(src, lengths)

            # Clip to L2 norm C (sensitivity bounding)
            norm  = ctx.norm(p=2, dim=-1, keepdim=True).clamp(min=1e-8)
            ctx   = ctx * torch.clamp(clip_c / norm, max=1.0)

            # Laplace noise ~ Lap(0, C/ε) per dimension
            noise_scale = clip_c / epsilon
            noise = torch.distributions.Laplace(
                torch.zeros_like(ctx), noise_scale
            ).sample()
            ctx = ctx + noise

            return self.decoder.greedy_decode(ctx, MAX_SEQ_LEN, device)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def train(texts: list[str], word2id: dict, device) -> ADePTModel:
    vocab_size = len(word2id)
    model      = ADePTModel(vocab_size).to(device)
    optimizer  = torch.optim.Adam(model.parameters(), lr=LR)

    dataset = _TextDataset(texts, word2id)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True,
                         collate_fn=_collate)

    best_loss  = float("inf")
    best_state = None
    no_improve = 0

    model.train()
    for epoch in range(1, EPOCHS + 1):
        epoch_loss = 0.0
        epoch_tok  = 0

        for padded, lengths in loader:
            padded = padded.to(device)
            tgt_in  = padded[:, :-1]   # SOS … last-before-EOS
            tgt_out = padded[:, 1:]    # first-after-SOS … EOS

            logits = model(padded, lengths, tgt_in)   # (B, T-1, V)

            loss = F.cross_entropy(
                logits.reshape(-1, logits.size(-1)),
                tgt_out.reshape(-1),
                ignore_index=PAD_ID,
            )

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            n_tok       = (tgt_out != PAD_ID).sum().item()
            epoch_loss += loss.item() * n_tok
            epoch_tok  += n_tok

        avg = epoch_loss / max(epoch_tok, 1)

        if avg < best_loss:
            best_loss  = avg
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            no_improve = 0
        else:
            no_improve += 1

        if epoch % 10 == 0:
            print(f"    Epoch {epoch:3d}/{EPOCHS}: loss={avg:.4f}  best={best_loss:.4f}",
                  flush=True)

        if no_improve >= PATIENCE:
            print(f"    Early stopping at epoch {epoch} (best loss={best_loss:.4f})",
                  flush=True)
            break

    model.load_state_dict(best_state)
    return model


# ---------------------------------------------------------------------------
# Checkpoint I/O
# ---------------------------------------------------------------------------
def save_checkpoint(model: ADePTModel, word2id: dict, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model_state": model.state_dict(),
                "word2id": word2id,
                "vocab_size": len(word2id),
                "embed_size": EMBED_SIZE,
                "hidden_size": HIDDEN_SIZE}, path)
    print(f"  Checkpoint saved → {path}", flush=True)


def load_checkpoint(path: Path, device) -> tuple[ADePTModel, dict, dict]:
    ckpt   = torch.load(path, map_location=device)
    word2id = ckpt["word2id"]
    id2word = {v: k for k, v in word2id.items()}
    model  = ADePTModel(ckpt["vocab_size"],
                        ckpt.get("embed_size", EMBED_SIZE),
                        ckpt.get("hidden_size", HIDDEN_SIZE)).to(device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()
    print(f"  Loaded checkpoint from {path}", flush=True)
    return model, word2id, id2word


# ---------------------------------------------------------------------------
# Per-dataset pipeline
# ---------------------------------------------------------------------------
def run_pretrain(filename: str, device, input_dir: Path = INPUT_DIR) -> Path:
    """Train autoencoder on dataset text and save checkpoint. Returns checkpoint path."""
    name        = filename.replace(".csv", "")
    input_path  = input_dir / filename
    ckpt_path   = CKPT_DIR / f"{name}_adept.pt"

    with open(input_path, newline="", encoding="utf-8") as f:
        rows  = list(csv.DictReader(f))
    texts = [r.get("text", "") for r in rows]

    print(f"\n[pretrain] {filename} ({len(texts)} docs) ...", flush=True)

    word2id, _ = build_vocab(texts)
    print(f"  Vocab size: {len(word2id)}", flush=True)

    model = train(texts, word2id, device)
    save_checkpoint(model, word2id, ckpt_path)
    return ckpt_path


def run_rewrite(filename: str, ckpt_path: Path, epsilon: float | None, device, input_dir: Path = INPUT_DIR):
    """Load checkpoint, apply DP rewriting, save output CSV."""
    name        = filename.replace(".csv", "")
    input_path  = input_dir  / filename
    output_path = OUTPUT_DIR / f"{name}_adept.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader     = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows       = list(reader)

    total = len(rows)

    if epsilon is None:
        word_counts = [len(nltk.word_tokenize(clean_text(r["text"]))) for r in rows]
        epsilon     = mean(word_counts)

    print(f"\n[rewrite] {filename} ({total} docs, ε={epsilon:.1f}) ...", flush=True)

    model, word2id, id2word = load_checkpoint(ckpt_path, device)

    texts   = [r.get("text", "") for r in rows]
    dataset = _TextDataset(texts, word2id)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False,
                         collate_fn=_collate)

    privatized: list[str] = []

    for padded, lengths in tqdm(loader, desc="  Rewriting", unit="batch"):
        padded = padded.to(device)
        preds  = model.privatize(padded, lengths, epsilon, CLIPPING_CONST, device)

        for row_preds in preds:
            tokens = []
            for tok_id in row_preds.tolist():
                if tok_id == EOS_ID:
                    break
                if tok_id not in (PAD_ID, SOS_ID):
                    tokens.append(id2word.get(tok_id, "<UNK>"))
            privatized.append(" ".join(tokens))

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()
        for i, row in enumerate(rows):
            writer.writerow({
                "id": row["id"],
                "text": privatized[i] if i < len(privatized) else "",
            })

    print(f"  Saved → {output_path}", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Run ADePT differentially private text transformation"
    )
    parser.add_argument(
        "--mode",
        choices=["pretrain", "rewrite", "all"],
        default="all",
        help="pretrain: train autoencoder only; rewrite: apply DP (needs --checkpoint); "
             "all (default): pretrain then rewrite",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Single dataset filename (e.g. imdb.csv). Default: all datasets.",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to a .pt checkpoint (required when --mode rewrite and --dataset set).",
    )
    parser.add_argument(
        "--epsilon",
        type=float,
        default=None,
        help="DP epsilon. Default: mean NLTK token count of the dataset "
             "(same convention as SanText / Diffractor).",
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        default=str(INPUT_DIR),
        help="Directory containing input CSVs. Default: home directory.",
    )
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    if not _HAS_TORCH:
        print("ERROR: PyTorch is required.  pip install torch")
        sys.exit(1)

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    input_dir = Path(args.input_dir)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}", flush=True)

    datasets = [args.dataset] if args.dataset else DATASETS

    start = time.time()

    for filename in datasets:
        if args.mode == "pretrain":
            run_pretrain(filename, device, input_dir)

        elif args.mode == "rewrite":
            if args.checkpoint:
                ckpt = Path(args.checkpoint)
            else:
                # Default checkpoint location
                ckpt = CKPT_DIR / filename.replace(".csv", "_adept.pt")
            if not ckpt.exists():
                print(f"ERROR: checkpoint not found at {ckpt}")
                print("  Run --mode pretrain first, or provide --checkpoint path.")
                sys.exit(1)
            run_rewrite(filename, ckpt, args.epsilon, device, input_dir)

        else:  # "all"
            ckpt = run_pretrain(filename, device, input_dir)
            run_rewrite(filename, ckpt, args.epsilon, device, input_dir)

    elapsed = time.time() - start
    print(f"\nAll done in {elapsed / 60:.1f} min. Output in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
