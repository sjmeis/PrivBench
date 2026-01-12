import torch
from transformers import pipeline
from sklearn.metrics import f1_score

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
        model_checkpoint: str = "distilbert-base-uncased-finetuned-sst-2-english",
        batch_size: int = 16,
    ):
        """
        :param model_checkpoint: Hugging Face model to use as the attacker.
                                 For real use, this should be an authorship /
                                 attribute classifier (e.g., trained on Yelp,
                                 Trustpilot, or blog corpus).
        """
        self.device = 0 if torch.cuda.is_available() else -1
        self.batch_size = batch_size
        self.clf = pipeline(
            "text-classification",
            model=model_checkpoint,
            device=self.device,
            batch_size=self.batch_size,
        )

    def _predict_labels(self, texts):
        if not texts:
            return []
        preds = self.clf(texts)
        if isinstance(preds, dict):
            preds = [preds]
        return [p["label"] for p in preds]

    def score(self, original, private, progress_callback=None):
        if len(original) != len(private):
            raise ValueError("`original` and `private` must have the same length.")
        if not original:
            raise ValueError("Inputs must be non-empty.")

        # We treat the attacker's predictions on the ORIGINAL texts as a proxy
        # for ground-truth attributes, and measure how often they are recovered
        # from PRIVATIZED texts.
        orig_labels = self._predict_labels(original)
        if progress_callback:
            progress_callback()

        priv_labels = self._predict_labels(private)
        if progress_callback:
            progress_callback()

        if len(orig_labels) != len(priv_labels):
            raise RuntimeError("Attacker returned mismatched number of predictions.")

        adv_f1 = f1_score(orig_labels, priv_labels, average="micro")

        privacy_score = (1.0 - adv_f1) * 100.0
        return round(privacy_score, 3)