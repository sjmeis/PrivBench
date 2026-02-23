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
        model_checkpoint: str = "sjmeis/yelp_authorship",
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
        self.labels = self._load_labels()

    def _load_labels(self):
        if os.path.exists(self.label_path):
            with open(self.label_path, 'r') as f:
                return json.load(f)
        else:
            print(f"Warning: {self.label_path} not found.")
            return {}

    def _predict_labels(self, texts):
        if not texts:
            return []
        preds = self.clf(texts)
        if isinstance(preds, dict):
            preds = [preds]
        return [p["label"] for p in preds]

    def score(self, original, private, progress_callback=None):
        try:
            if len(original) != len(private):
                raise ValueError("`original` and `private` must have the same length.")
            if not original:
                raise ValueError("Inputs must be non-empty.")
            
            original_cleaned = [str(x) for x in original if pd.notna(x) and str(x).strip() != ""]
            private_cleaned = [str(x) for x in private if pd.notna(x) and str(x).strip() != ""]

            if not original_cleaned or not private_cleaned:
                return 0.0

            # We treat the attacker's predictions on the ORIGINAL texts as a proxy
            # for ground-truth attributes, and measure how often they are recovered
            # from PRIVATIZED texts.
            orig_labels = self._predict_labels(original_cleaned)
            if progress_callback:
                progress_callback()

            priv_labels = self._predict_labels(private_cleaned)
            if progress_callback:
                progress_callback()

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
