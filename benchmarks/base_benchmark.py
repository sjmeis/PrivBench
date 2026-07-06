from abc import ABC, abstractmethod

class BaseBenchmark(ABC):
    def __init__(self, **kwargs):
        pass

    @abstractmethod
    def score(self, original, private, progress_callback=None):
        """
        Abstract method to compute the benchmark score.
        Args:
            original: Original dataset
            private: Privatized dataset
            progress_callback: Optional callback for progress tracking
        """
        pass

    def _update_progress(self, progress_callback, current, total):
        """Helper method to handle progress updates"""
        if progress_callback:
            progress_callback(current)