import torch
import pandas as pd
from transformers import pipeline
from sklearn.metrics import f1_score
import json
import os
import gc

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


@with_progress_tracking
class AttributeInference(BaseBenchmark):
    """
    Benchmark module for attribute inference / authorship attacks.

    Idea:
        - Use a pretrained text classifier as the *attacker* (e.g., age/gender/
          author ID, or in simple demos, sentiment or domain).
        - Run the attacker on the original texts and on the privatized texts.
        - Measure how often the predicted attributes agree between original and
          privatized texts (F1 / accuracy).

    Intuition:
        - If privatization preserves implicit attributes well (bad for privacy),
          the classifier predictions will agree frequently -> high adversarial F1
        - If privatization obfuscates attributes (good for privacy), predictions
          will change more often -> lower adversarial F1

    This module returns a score in [0, 100] where *higher* means *better privacy*,
    i.e., lower agreement between attacker predictions on original vs. private.
    """

    def __init__(
        self,
        model_checkpoint: str = "sjmeis/yelp_authorship_small",
        batch_size: int = 16,
    ):
        """
        :param model_checkpoint: Hugging Face model to use as the attacker.
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.batch_size = batch_size
        self.clf = pipeline(
            "text-classification",
            model=model_checkpoint,
            device=self.device,
            model_kwargs={"torch_dtype": torch.float16},
            batch_size=self.batch_size,
            truncation=True,
            max_length=512
        )

        self.label_path = "/app/authorship_labels.json"
        self.labels = [9, 0, 6, 0, 3, 0, 5, 0, 3, 2, 7, 2, 5, 9, 3, 7, 0, 6, 8, 4, 1, 6, 5, 1, 0, 5, 0, 2, 9, 6, 0, 4, 2, 6, 4, 1, 6, 1, 8, 0, 1, 0, 0, 0, 1, 3, 5, 6, 6, 7, 6, 3, 3, 4, 4, 0, 0, 3, 0, 0, 7, 0, 0, 2, 1, 1, 3, 4, 8, 4, 0, 8, 2, 6, 7, 3, 0, 6, 5, 4, 2, 4, 0, 9, 2, 5, 9, 3, 0, 0, 5, 2, 1, 6, 7, 1, 2, 0, 2, 2, 5, 9, 0, 0, 6, 5, 6, 4, 7, 3, 2, 9, 4, 8, 4, 9, 0, 9, 3, 2, 1, 7, 2, 7, 1, 5, 4, 4, 0, 0, 9, 3, 2, 8, 7, 0, 0, 3, 6, 4, 2, 0, 5, 6, 4, 2, 9, 3, 9, 6, 2, 6, 7, 6, 8, 9, 9, 1, 7, 8, 3, 3, 8, 3, 5, 6, 0, 1, 8, 7, 1, 5, 5, 7, 4, 8, 6, 9, 9, 7, 2, 5, 0, 0, 0, 5, 4, 6, 0, 3, 3, 2, 2, 8, 9, 3, 5, 1, 4, 2, 1, 5, 6, 5, 5, 1, 9, 2, 5, 4, 0, 7, 4, 9, 0, 0, 6, 5, 2, 5, 6, 9, 2, 7, 2, 6, 3, 2, 2, 7, 6, 2, 5, 1, 8, 0, 5, 9, 0, 5, 2, 0, 9, 6, 1, 9, 7, 2, 3, 1, 2, 0, 3, 6, 8, 9, 2, 6, 6, 3, 5, 6, 3, 2, 1, 4, 0, 3, 4, 3, 7, 7, 0, 8, 4, 0, 7, 1, 2, 2, 8, 7, 3, 7, 6, 0, 2, 2, 3, 1, 4, 0, 0, 4, 5, 0, 5, 4, 6, 7, 4, 7, 6, 0, 5, 2, 8, 5, 3, 1, 6, 9, 2, 4, 1, 3, 5, 2, 2, 5, 7, 9, 4, 5, 2, 1, 7, 4, 5, 0, 4, 2, 5, 0, 6, 8, 8, 0, 0, 1, 0, 8, 4, 2, 0, 1, 1, 5, 1, 5, 7, 3, 0, 6, 1, 0, 0, 2, 8, 1, 3, 5, 7, 8, 6, 7, 5, 0, 0, 6, 2, 3, 3, 6, 1, 2, 2, 7, 6, 7, 0, 7, 4, 9, 5, 4, 1, 7, 2, 4, 8, 0, 3, 5, 4, 8, 0, 8, 0, 8, 9, 5, 4, 0, 6, 8, 6, 8, 3, 2, 6, 0, 0, 0, 0, 2, 5, 0, 5, 5, 9, 9, 1, 2, 4, 5, 6, 1, 5, 0, 2, 6, 0, 8, 3, 2, 8, 2, 5, 1, 7, 2, 7, 1, 2, 4, 1, 8, 6, 4, 6, 4, 4, 4, 9, 1, 1, 3, 7, 3, 1, 0, 4, 1, 5, 3, 9, 0, 0, 2, 1, 2, 2, 0, 2, 6, 7, 7, 3, 2, 1, 9, 9, 3, 5, 9, 0, 4, 2, 7, 0, 6, 5, 7, 8, 4, 5, 3, 2, 0, 7, 1, 9, 3, 4, 3, 6, 6, 8, 1, 5, 8, 2, 2, 7, 0, 5, 4, 7, 2, 8, 2, 7, 5, 0, 8, 4, 6, 1, 4, 3, 1, 7, 6, 0, 6, 7, 3, 3, 2, 1, 4, 0, 5, 0, 5, 1, 2, 6, 9, 3, 1, 9, 6, 5, 1, 8, 0, 6, 7, 6, 4, 4, 0, 0, 8, 7, 1, 1, 1, 7, 5, 0, 0, 5, 4, 2, 8, 1, 9, 6, 0, 6, 1, 4, 0, 0, 4, 6, 0, 3, 1, 6, 1, 2, 9, 6, 9, 7, 0, 0, 6, 0, 0, 7, 1, 3, 3, 0, 6, 2, 9, 3, 3, 4, 0, 2, 0, 9, 5, 6, 7, 0, 2, 8, 4, 9, 3, 4, 4, 4, 3, 5, 8, 5, 4, 5, 0, 3, 5, 4, 6, 1, 5, 4, 1, 5, 0, 1, 7, 5, 8, 4, 1, 5, 7, 5, 0, 9, 1, 0, 0, 3, 7, 5, 0, 1, 4, 7, 4, 5, 7, 0, 7, 0, 0, 2, 2, 3, 4, 1, 8, 1, 9, 0, 0, 5, 1, 5, 9, 4, 5, 2, 4, 2, 5, 0, 0, 9, 6, 2, 3, 8, 2, 2, 5, 3, 2, 0, 5, 4, 3, 0, 3, 0, 5, 8, 8, 0, 0, 4, 3, 0, 5, 2, 2, 0, 7, 4, 0, 0, 2, 4, 6, 0, 7, 1, 8, 6, 2, 0, 6, 3, 0, 3, 3, 1, 2, 5, 8, 1, 6, 0, 9, 4, 8, 3, 9, 5, 5, 0, 4, 0, 3, 3, 0, 9, 3, 8, 8, 4, 1, 2, 4, 6, 1, 9, 4, 8, 1, 6, 1, 8, 0, 8, 6, 1, 2, 1, 0, 8, 1, 3, 3, 7, 8, 4, 6, 0, 5, 0, 2, 1, 5, 5, 6, 4, 4, 8, 5, 8, 4, 0, 0, 5, 1, 8, 0, 3, 1, 3, 1, 0, 0, 2, 8, 5, 6, 0, 6, 1, 1, 3, 0, 6, 3, 2, 9, 2, 5, 9, 4, 2, 0, 8, 4, 3, 2, 3, 4, 1, 1, 9, 0, 9, 8, 4, 6, 6, 4, 7, 9, 7, 5, 8, 7, 0, 6, 8, 0, 3, 4, 7, 0, 4, 0, 6, 9, 4, 0, 8, 0, 8, 5, 0, 6, 2, 0, 9, 4, 1, 9, 1, 1, 1, 8, 2, 2, 0, 0, 2, 0, 6, 3, 4, 5, 5, 2, 0, 7, 2, 6, 0, 0, 3, 7, 0, 0, 3, 1, 4, 4, 9, 0, 7, 6, 5, 1, 1, 0, 1, 3, 2, 9, 0, 2, 2, 1, 0, 2, 7, 0, 9, 7, 1, 0, 0, 0, 0, 8, 4, 1, 2, 4, 9, 7, 9, 2, 8, 0, 1, 1, 0, 5, 4, 0, 4, 8, 2, 2, 9, 9, 9, 5, 9, 2, 0, 8, 9, 0, 3, 1, 4, 3, 9, 8, 3, 5, 0, 5, 0, 3, 9, 6, 4, 8, 1, 4, 1, 2]

    def _load_labels(self):
        try:
            with open(self.label_path, 'r') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception as e:
            print(f"Error loading labels: {e}")
            return []

    def _predict_labels(self, texts):
        if not texts:
            return []
        preds = self.clf(texts)
        if isinstance(preds, dict):
            preds = [preds]
        return [int(p["label"][-1]) for p in preds]

    def score(self, original, private, progress_callback=None):
        try:
            if len(original) != len(private):
                raise ValueError("`original` and `private` must have the same length.")
            if not original:
                raise ValueError("Inputs must be non-empty.")
            
            valid_pairs = []
            for og, priv in zip(original, private):
                if pd.notna(priv):
                    valid_pairs.append((str(og), str(priv)))
                else:
                    valid_pairs.append((str(og), " "))

            original_cleaned, private_cleaned = zip(*valid_pairs)
            original_cleaned = list(original_cleaned)
            private_cleaned = list(private_cleaned)

            num_samples = len(original_cleaned)

            orig_labels = self._predict_labels(original_cleaned)
            if progress_callback:
                progress_callback(num_samples // 2)

            priv_labels = self._predict_labels(private_cleaned)
            if progress_callback:
                progress_callback(num_samples)

            if len(orig_labels) != len(priv_labels):
                raise RuntimeError("Attacker returned mismatched number of predictions.")

            og_f1 = f1_score(orig_labels, self.labels, average="micro")
            priv_f1 = f1_score(priv_labels, self.labels, average="micro")

            privacy_score = min(100.0, (1.0 - (priv_f1/og_f1)) * 100.0)
            return round(privacy_score, 3)
        finally:
            del self.clf
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
