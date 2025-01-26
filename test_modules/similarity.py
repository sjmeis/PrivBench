import evaluate
import torch
from sentence_transformers import SentenceTransformer, util
from tqdm.auto import tqdm


class ProgressTracker:
    """Utility class for progress tracking and intermediate reporting."""
    def __init__(self, total_steps, progress_callback=None):
        self.total_steps = total_steps
        self.progress_callback = progress_callback
        self.last_reported = 0

    def update(self, current_step):
        if self.progress_callback:
            self.progress_callback(current_step)
        progress = (current_step / self.total_steps) * 100
        if progress - self.last_reported >= 10:  # Report every 10%
            print(f"Progress: {current_step}/{self.total_steps} ({progress:.1f}%)")
            self.last_reported = progress


class BLEU:
    def __init__(self, normalize=True):
        self.bleu = evaluate.load("bleu")
        self.normalize = normalize
        print("Initialized BLEU scorer with normalization:", self.normalize)

    def score(self, original, private, progress_callback=None):
        """Calculate BLEU score with progress tracking."""
        total_rows = len(original)
        tracker = ProgressTracker(total_steps=total_rows, progress_callback=progress_callback)

        score = self.bleu.compute(predictions=private, references=original)["bleu"]
        normalized_score = max(round(score, 3) * 2, 1) if self.normalize else round(score, 3)
        tracker.update(total_rows)  # Final update
        return normalized_score


class CS:
    def __init__(self, model_checkpoint="thenlper/gte-small", batch_size=32):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.batch_size = batch_size
        print(f"Initialized CS scorer with model {model_checkpoint} on device {self.device}")

    def score(self, original, private, progress_callback=None):
        """Calculate cosine similarity with batch processing and progress tracking."""
        total_rows = len(original)
        tracker = ProgressTracker(total_steps=total_rows, progress_callback=progress_callback)

        # Batch processing
        orig_embed = []
        priv_embed = []
        for i in tqdm(range(0, total_rows, self.batch_size), desc="Encoding embeddings"):
            batch_original = original[i : i + self.batch_size]
            batch_private = private[i : i + self.batch_size]
            orig_embed.append(self.model.encode(batch_original, convert_to_tensor=True))
            priv_embed.append(self.model.encode(batch_private, convert_to_tensor=True))
            tracker.update(min(i + self.batch_size, total_rows))

        orig_embed = torch.cat(orig_embed, dim=0).to(self.device)
        priv_embed = torch.cat(priv_embed, dim=0).to(self.device)

        # Calculate cosine similarity
        scores = util.pairwise_cos_sim(orig_embed, priv_embed)
        return round(float(scores.mean()), 3)


class Similarity:
    def __init__(self, normalize=True, model_checkpoint="thenlper/gte-small", batch_size=32):
        self.bleu = BLEU(normalize=normalize)
        self.cs = CS(model_checkpoint=model_checkpoint, batch_size=batch_size)
        print("Initialized Similarity scorer with BLEU and CS components.")

    def score(self, original, private, progress_callback=None):
        """Calculate combined similarity score with progress tracking."""
        total_rows = len(original)
        tracker = ProgressTracker(total_steps=total_rows, progress_callback=progress_callback)

        print(f"Calculating similarity score for {total_rows} rows...")

        # BLEU score
        bleu_score = self.bleu.score(original, private, progress_callback=tracker.update)
        print(f"Intermediate BLEU score: {bleu_score}")

        # Cosine Similarity score
        cs_score = self.cs.score(original, private, progress_callback=tracker.update)
        print(f"Intermediate CS score: {cs_score}")

        # Combine the scores
        combined_score = round((bleu_score + cs_score) * 100 / 2, 3)
        print(f"Final similarity score: {combined_score}")
        return combined_score
