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


class NearestNeighbor:
    def __init__(self, top_k=1000, model_checkpoint="thenlper/gte-small", batch_size=32):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.top_k = top_k
        self.batch_size = batch_size
        print(f"Initialized NearestNeighbor with model {model_checkpoint} on device {self.device}")

    def score(self, original, private, progress_callback=None):
        """Calculate Nearest Neighbor score with batch processing and progress tracking."""
        total_rows = len(original)
        tracker = ProgressTracker(total_steps=total_rows, progress_callback=progress_callback)

        # Encode private embeddings in a single batch
        priv_embed = []
        for i in tqdm(range(0, len(private), self.batch_size), desc="Encoding private embeddings"):
            batch_private = private[i : i + self.batch_size]
            priv_embed.append(self.model.encode(batch_private, convert_to_tensor=True))
            tracker.update(min(i + self.batch_size, total_rows))

        priv_embed = torch.cat(priv_embed, dim=0).to(self.device)

        # Process original sentences in batches
        found = 0
        total = 0

        for i in tqdm(range(0, len(original), self.batch_size), desc="Processing original embeddings"):
            batch_original = original[i : i + self.batch_size]
            o_embed = self.model.encode(batch_original, convert_to_tensor=True)
            o_embed = o_embed.to(self.device)

            # Perform semantic search for each batch
            results = util.semantic_search(
                query_embeddings=o_embed,
                corpus_embeddings=priv_embed,
                top_k=self.top_k,
            )

            for j, res in enumerate(results):
                total += 1
                # Check if the original sentence index is among the top_k neighbors
                indices = [int(x["corpus_id"]) for x in res]
                try:
                    find = indices.index(i + j) + 1
                except ValueError:
                    find = self.top_k
                found += find

            tracker.update(min(i + self.batch_size, total_rows))

        final_score = round(found / total, 3) if total > 0 else 0.0
        print(f"Final Nearest Neighbor score: {final_score}")
        return final_score
