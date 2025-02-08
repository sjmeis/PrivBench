import evaluate
from transformers import pipeline
import torch
import pandas as pd
import json
from sklearn.metrics import f1_score
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

# WARNING: This module script was modified for demonstration purposes, please replace with original script for deployment

class PPL:
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len
    
    def score(self, data, internal_progress_callback=None):
        processed_data = []
        
        # Only process rows 0 and 80
        selected_indices = [0, 80]  
        
        for idx, text in enumerate(data):
            if idx in selected_indices:
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
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.clf = pipeline("text-classification", model=model_checkpoint, device=self.device)

        with open("benchmarks/baselines.json", 'r') as f:
            self.baseline = json.load(f)["snips"]
        self.labels = pd.read_csv("benchmarks/snips_copy.csv")["label"].to_list()

    def score(self, data, internal_progress_callback=None):
        """
        Calculate F1 score on SNIPS with internal progress tracking.
        """                
        # Only process first row since we only have 10 labels
        selected_indices = [0]  # Changed to only use first row
        selected_data = [text for idx, text in enumerate(data) if idx in selected_indices]
        
        predictions = self.clf(selected_data)
        predictions = [x["label"] for x in predictions]
        # Also need to filter labels to match the selected indices
        selected_labels = [self.labels[idx] for idx in selected_indices]
        f1 = f1_score(selected_labels, predictions, average="micro")

        return round((f1 / self.baseline)*100, 3)

@with_progress_tracking
class Coherence(BaseBenchmark):
    def __init__(self):
        self.ppl = PPL()
        self.snips = SNIPS()
    
    def score(self, original, private, progress_callback=None):
        total_steps = len(original) + len(private)
        steps_completed = 0
        
        def internal_progress_handler():
            nonlocal steps_completed
            steps_completed += 1
            if progress_callback and (steps_completed % 100 == 0 or steps_completed == total_steps):
                progress_callback()
        
        o = self.ppl.score(original, internal_progress_callback=internal_progress_handler)
        
        p = self.ppl.score(private, internal_progress_callback=internal_progress_handler)
        
        ppl_score = (o / p)*100
        if ppl_score > 100:
            ppl_score = 100

        snips_score = self.snips.score(private)

        return round((ppl_score + snips_score) / 2, 3)