from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking
import random

@with_progress_tracking
class Bonus(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        pass
    
    def score(self, original, private, progress_callback=None):
        """
        Bonus score for user!
        """
        
        random_bonus = 0
        total = 0

        for x, y in zip(original, private):
            random_bonus += random.random()
            total += 1
                
            if progress_callback:
                progress_callback()
        
        score = 99 + (random_bonus / total)
        return round(score, 3)
