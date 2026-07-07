import torch
import mauve
import pandas as pd

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

@with_progress_tracking
class Mauve(BaseBenchmark):
    """
    Benchmark module based on the MAUVE metric.

    MAUVE compares the overall distribution of model outputs to a reference
    distribution in an embedding space. Here:

    - `original` texts define the reference distribution.
    - `private` texts are the privatized outputs whose distribution we compare.

    Intuition:
    - High MAUVE means the privatized outputs as a whole "look like" the
      originals in terms of global statistics in an embedding space, even if
      individual examples are different.
    - Very low MAUVE suggests the overall distribution of privatized outputs
      has drifted far from the reference.
    """

    def __init__(
        self,
        featurize_model_name: str = "gpt2",
        max_text_length: int = 128,
        device_id: int | None = None,
        **mauve_kwargs,
    ):
        if device_id is None:
            device_id = 0 if torch.cuda.is_available() else -1

        self.featurize_model_name = featurize_model_name
        self.max_text_length = max_text_length
        self.device_id = device_id
        self.mauve_kwargs = mauve_kwargs

    def score(self, original, private, progress_callback=None):
        original = [str(x) if pd.notna(x) else " " for x in original]
        private = [str(x) if pd.notna(x) else " " for x in private]

        if not original or not private:
            return 0.0

        result = mauve.compute_mauve(
            p_text=original,
            q_text=private,
            featurize_model_name=self.featurize_model_name,
            max_text_length=self.max_text_length,
            device_id=self.device_id,
            **self.mauve_kwargs,
        )
        mauve_score = float(result.mauve)
        return round(mauve_score * 100, 3)