import evaluate
from transformers import pipeline
import torch
import pandas as pd
import json
from sklearn.metrics import f1_score
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


class PPL:
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        """
        Initialize PPL calculator with specified model and max length.
        
        Args:
            model_checkpoint (str): Model to use for perplexity calculation
            max_len (int): Maximum sequence length to process
        """
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len
    
    def score(self, data, internal_progress_callback=None):
        """
        Calculate perplexity score with internal progress tracking.
        
        Args:
            data: List of text sequences
            internal_progress_callback: Internal callback for progress tracking
            
        Returns:
            float: Mean perplexity score
        """
        processed_data = []
        for idx, text in enumerate(data):
            truncated_text = " ".join(text.split()[:self.max_len])
            processed_data.append(truncated_text)
            if internal_progress_callback:
                internal_progress_callback()
                
        score = self.ppl.compute(
            predictions=processed_data, 
            model_id=self.model_checkpoint
        )["mean_perplexity"]
        
        return round(score, 3)
    
class SNIPS:
    def __init__(self, model_checkpoint="benayas/roberta-full-finetuned-snips_100pct_v2"):
        """
        Initialize SNIPS inference with classification pipeline.
        
        Args:
            model_checkpoint (str): Fine-tuned model to use.
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.clf = pipeline("text-classification", model=model_checkpoint, device=self.device)

        with open("baselines.json", 'r') as f:
            self.baseline = json.load(f)["snips"]
        self.labels = pd.read_csv("baseline_data/snips.csv")["labels"].to_list()

    def score(self, data, internal_progress_callback=None):
        """
        Calculate F1 score on SNIPS with internal progress tracking.
        
        Args:
            data: List of (privatized) text sequences
            internal_progress_callback: Internal callback for progress tracking
            
        Returns:
            float: Micro-F1 score
        """                
        predictions = self.clf(data)
        predictions = [x["label"] for x in predictions]
        f1 = f1_score(self.labels, predictions, average="micro")

        return round((f1 / self.baseline)*100, 3)


@with_progress_tracking
class Coherence(BaseBenchmark):
    def __init__(self):
        """Initialize Coherence calculator using PPL and SNIPS"""
        self.ppl = PPL()
        self.snips = SNIPS()
    
    def score(self, original, private, progress_callback=None):
        """
        Calculate coherence score with progress tracking.
        
        Args:
            original: List of original texts
            private: List of privatized texts
            progress_callback: Optional callback for progress tracking to Celery
            
        Returns:
            float: Coherence score
        """
        total_steps = len(original) + len(private)
        steps_completed = 0
        
        def internal_progress_handler():
            nonlocal steps_completed
            steps_completed += 1
            if progress_callback and (steps_completed % 100 == 0 or steps_completed == total_steps):
                progress_callback()
        
        # First phase: Process original texts
        o = self.ppl.score(original, internal_progress_callback=internal_progress_handler)
        
        # Second phase: Process private texts
        p = self.ppl.score(private, internal_progress_callback=internal_progress_handler)
        
        ppl_score = (o / p)*100

        snips_score = self.snips.score(private)

        return round((ppl_score + snips_score) / 2, 3)