import numpy as np
import spacy
from collections import Counter
import pandas as pd

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

class NERpriv(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.nlp = spacy.load("en_core_web_sm")
    
    def score(self, original, private, progress_callback=None):
        """
        Calculate NER privacy score with progress tracking.
        """
        removed = 0
        total = 0
        
        for x, y in zip(original, private):
            o_doc = self.nlp(x)
            
            if pd.isnull(y):
                total += len([x.text for x in o_doc.ents])
                if progress_callback:
                    progress_callback()
                continue
                
            p_doc = self.nlp(y)
            counts = Counter()
            
            for ent in o_doc.ents:
                counts[ent.text] += 1
                
            priv_ents = set()
            for ent in p_doc.ents:
                priv_ents.add(ent.text)
                
            for ent in counts:
                if ent not in priv_ents and ent.lower() not in priv_ents:
                    removed += counts[ent]
                total += counts[ent]
                
            if progress_callback:
                progress_callback()
        
        return round((removed / total) * 100) if total > 0 else 0.0

@with_progress_tracking
class LengthRobustness(BaseBenchmark):
    """
    Meta-benchmark that measures how sensitive a base privacy/utility metric is
    to document length.

    Idea:
        - Use some *base* benchmark (e.g. Attribute Inference, NERPriv, etc.)
          to score subsets of the data grouped by document length.
        - If scores are similar across length bins (short / medium / long),
          the method is robust to length.
        - If scores are great for short texts but collapse for longer ones,
          robustness is low.

    This implementation uses AttributeInference as the default base metric for
    demonstration, but you can swap it for another benchmark that implements
    the same `score(original, private)` interface.
    """

    def __init__(
        self,
        base_benchmark_cls=NERpriv,
        length_bins=(0, 20, 100, np.inf), # [0,20) -> "short", [20,100) -> "medium", [100,∞) -> "long"
        min_examples_per_bin: int = 2,
        **kwargs
    ):
        """
        :param base_benchmark_cls: benchmark class used to compute scores per bin.
                                   Must expose `score(original, private) -> float`.
        :param length_bins: boundaries (in word counts) defining length bins.
                            If None, bins will be derived from the length
                            distribution of `original` using quantiles.
        :param min_examples_per_bin: minimum number of examples required in a bin
                                     to compute a score for that bin.
        """
        super().__init__(**kwargs)
        self.base_benchmark = base_benchmark_cls()
        self.length_bins = length_bins
        self.min_examples_per_bin = min_examples_per_bin

    def _length(self, text: str) -> int:
        return len(text.split()) # word-level length

    def _bin_index(self, length: int, bins) -> int:
        """Return the index of the length bin for a given length."""
        for i in range(len(bins) - 1):
            if bins[i] <= length < bins[i + 1]:
                return i
        # Fallback: last bin
        return len(bins) - 2

    def score(self, original, private, progress_callback=None):
        if len(original) != len(private):
            raise ValueError("`original` and `private` must have the same length.")
        if not original:
            raise ValueError("Inputs must be non-empty.")

        # Determine bins: either user-provided, or derived from data via quantiles.
        if self.length_bins is not None:
            bins = self.length_bins
        else:
            lengths = np.array([self._length(o) for o in original], dtype=float)
            # Use 1/3 and 2/3 quantiles to define short / medium / long.
            q1, q2 = np.quantile(lengths, [0.33, 0.66])
            bins = (0.0, float(q1), float(q2), float("inf"))

        # Prepare bins: each bin holds lists of original/private texts
        num_bins = len(bins) - 1
        bin_original = [[] for _ in range(num_bins)]
        bin_private = [[] for _ in range(num_bins)]

        for i, (o, p) in enumerate(zip(original, private)):
            L = self._length(o)
            b = self._bin_index(L, bins)
            bin_original[b].append(o)
            bin_private[b].append(p)

            if progress_callback and (i + 1) % 200 == 0:
                progress_callback()

        # Compute base metric per bin where there are enough examples
        bin_scores = []
        for b in range(num_bins):
            if len(bin_original[b]) < self.min_examples_per_bin:
                continue
            score_b = self.base_benchmark.score(bin_original[b], bin_private[b])
            bin_scores.append(score_b)

        if not bin_scores or len(bin_scores) == 1:
            # If we don't have enough populated bins, we cannot say much about robustness; fall back to the global base score.
            global_score = self.base_benchmark.score(original, private)
            return round(global_score, 3)

        bin_scores = np.array(bin_scores, dtype=float)
        mean_score = bin_scores.mean()          # average performance across bins
        score_range = bin_scores.max() - bin_scores.min()  # disparity across bins

        mean_component = mean_score / 100.0

        range_tolerance = 20.0  # allows up to ~20 points difference between bins before hitting 0
        range_component = max(0.0, 1.0 - (score_range / range_tolerance)) # penalizes large gaps between bins

        combined = 0.5 * mean_component + 0.5 * range_component
        return round(combined * 100, 3)