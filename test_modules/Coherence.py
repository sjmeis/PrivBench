import evaluate

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


class PPL:
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len

    def score(self, data, progress_callback=None):
        # Truncate input data to the max length
        data = [" ".join(x.split()[:self.max_len]) for x in data]

        # Initialize progress tracker
        tracker = ProgressTracker(total_steps=len(data), progress_callback=progress_callback)

        # Compute perplexity in chunks for progress tracking
        batch_size = 32  # Define a reasonable batch size for processing
        scores = []
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            batch_score = self.ppl.compute(predictions=batch, model_id=self.model_checkpoint)["mean_perplexity"]
            scores.append(batch_score)

            # Update progress tracker
            tracker.update(i + len(batch))

        # Calculate the final mean perplexity
        mean_score = sum(scores) / len(scores)
        return round(mean_score, 3)


class Coherence:
    def __init__(self):
        self.ppl = PPL()

    def score(self, original, private, progress_callback=None):
        # Score the original text
        print("Scoring original text...")
        o = self.ppl.score(original, progress_callback=progress_callback)

        # Score the private text
        print("Scoring private text...")
        p = self.ppl.score(private, progress_callback=progress_callback)

        # Compute coherence score
        score = max(o / p, 1)
        return round(score, 3)
