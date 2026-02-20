import math
from typing import List, Sequence
import pandas as pd

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


@with_progress_tracking
class CarliniExposure(BaseBenchmark):
    """
    Benchmark module implementing Carlini-style exposure.

    This metric is designed to quantify *memorization* of specific secrets
    (e.g., a particular string) by a generative model. In the classic setting,
    exposure is defined as:

        exposure = log2(|C|) - log2(rank(secret))

    where:
      - C is the candidate set of possible secrets
      - rank(secret) is the position of the true secret in a list of
        candidates ordered from most- to least-likely under the model.

    Here we expect `original` to contain the *true secrets* and `private`
    to contain lists of *candidate secrets* ordered from most- to least-
    likely according to some scoring procedure (e.g., model likelihood).
    """

    def __init__(self):
        super().__init__()

    def _single_exposure(self, secret: str, candidates: Sequence[str]) -> float:
        if not candidates:
            raise ValueError("Candidates list must be non-empty for exposure computation.")

        try:
            # rank is 1-based
            rank = candidates.index(secret) + 1
        except ValueError:
            # If the secret is not in the candidate list, we treat its rank
            # as worse than all candidates (rank = |C| + 1).
            rank = len(candidates) + 1

        candidate_space_size = len(candidates)
        # Classic Carlini exposure: log2(|C|) - log2(rank)
        exposure = math.log2(candidate_space_size) - math.log2(rank)
        return exposure

    def score(self, original: List[str], private: List[Sequence[str]], progress_callback=None) -> float:
        if len(original) != len(private):
            raise ValueError("`original` and `private` must have the same length.")

        if not original:
            raise ValueError("Inputs must be non-empty.")

        exposures = []
        total = len(original)

        for i, (secret, candidates) in enumerate(zip(original, private)):
            if not candidates or len(candidates) == 0:
                exposures.append(0.0)

            exp = self._single_exposure(secret, candidates)
            exposures.append(exp)

            if progress_callback and (i + 1) % 100 == 0:
                progress_callback()

        avg_exposure = sum(exposures) / len(exposures)

        scaled = max(0.0, avg_exposure) * 5.0
        return round(min(scaled, 100.0), 3)