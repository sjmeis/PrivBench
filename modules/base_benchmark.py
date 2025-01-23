from abc import ABC, abstractmethod

class BaseBenchmark(ABC):

    @abstractmethod
    def score(self, original, private):
        """Abstract method to compute the benchmark score."""
        pass