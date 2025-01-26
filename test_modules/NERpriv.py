import pandas as pd
import spacy
from collections import Counter
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


class NERpriv:
    def __init__(self):
        # Load SpaCy model with unnecessary components disabled
        self.nlp = spacy.load("en_core_web_sm", disable=["tagger", "parser", "attribute_ruler", "lemmatizer"])
        print("Initialized NERpriv with SpaCy model")

    def score(self, original, private, progress_callback=None):
        """Calculate NER-based privacy score."""
        removed = 0
        total = 0
        total_rows = len(original)
        tracker = ProgressTracker(total_steps=total_rows, progress_callback=progress_callback)

        for idx, (orig_text, priv_text) in enumerate(tqdm(zip(original, private), total=total_rows, desc="Processing rows")):
            # Process original and private texts
            o_doc = self.nlp(orig_text)
            priv_entities = set()

            if pd.isnull(priv_text) or not priv_text.strip():
                total += len(o_doc.ents)  # All entities are considered "removed"
                tracker.update(idx + 1)
                continue

            p_doc = self.nlp(priv_text)
            priv_entities = {ent.text.lower() for ent in p_doc.ents}

            for ent in o_doc.ents:
                if ent.text.lower() not in priv_entities:
                    removed += 1
                total += 1

            # Update progress tracker
            tracker.update(idx + 1)

        final_score = round((removed / total) * 100) if total > 0 else 0.0
        print(f"Final NER-based privacy score: {final_score}")
        return final_score
