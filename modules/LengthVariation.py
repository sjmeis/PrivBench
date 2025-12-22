import numpy as np
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

@with_progress_tracking
class LengthVariation(BaseBenchmark):
    """
    Benchmark module that measures how much the length of privatized text
    varies compared to the original text.

    Intuition:
    - A *good* privatization method should not be perfectly predictable
      in length (e.g., always same number of words / characters as the original),
      because that can leak information.
    - But it also should not be wildly unstable in length.
    - We therefore reward:
        * average private/original length ratio close to 1 (no huge shrink/growth)
        * a moderate amount of variance in that ratio across examples.
    """

    def __init__(self, eps: float = 1e-6):
        self.eps = eps

    def _length(self, text: str) -> int:
        return len(text.split()) # word-level length
        # return len(text) # character-level length

    def score(self, original, private, progress_callback=None):

        assert len(original) == len(private), "Original and private must have same length" # check if there is a private text for each original text

        ratios = [] 
        total = len(original)

        for i, (o, p) in enumerate(zip(original, private)):
            o_len = self._length(o)
            p_len = self._length(p)

            ratio = p_len / (o_len + self.eps) # add eps to avoid division by zero when an original text has length 0
            ratios.append(ratio)

            if progress_callback and (i + 1) % 100 == 0:
                progress_callback()

        ratios = np.array(ratios)
        mean = ratios.mean()
        std = ratios.std()

        mean_penalty = abs(mean - 1.0)          # 0 is best
        mean_score = max(0.0, 1.0 - mean_penalty)  # as mean moves away from 1 subtract a penalty

        target_std = 0.3 # target standard deviation
        std_tolerance = 0.5 # tolerance factor controlling how fast it decays
        std_penalty = abs(std - target_std) # how far from target_std we are
        std_score = max(0.0, 1.0 - (std_penalty / std_tolerance))  # as std moves away from target_std subtract a penalty
        
        combined = 0.5 * mean_score + 0.5 * std_score
        return round(combined * 100, 3)