from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking
import pandas as pd

@with_progress_tracking
class Basis(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        pass
    
    def score(self, original, private, progress_callback=None):
        """
        Basis check: not same texts.
        """
        passed = 0
        total = 0
        
        for x, y in zip(original, private):
            if pd.isnull(y) == True:
                passed += 1
                total += 1
                continue
                
            if x != y:
                passed += 1
            total += 1

            if progress_callback:
                progress_callback()
        
        return round((passed / total) * 100, 3)
