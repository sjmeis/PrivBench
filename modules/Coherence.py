import evaluate
import torch
import pandas as pd
from transformers import AutoTokenizer
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

class PPL:
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len

        self.tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
    
    def score(self, data, internal_progress_callback=None):
        processed_data = [str(x) for x in data if pd.notna(x) and str(x).strip() != ""]

        if not processed_data:
            return 0.0

        truncated_data = [" ".join(text.split()[:self.max_len]) for text in processed_data]

        if internal_progress_callback:
            for _ in truncated_data:
                internal_progress_callback()
                    
        score = self.ppl.compute(
            predictions=processed_data, 
            model_id=self.model_checkpoint
            device="cuda" if torch.cuda.is_available() else "cpu"
        )["mean_perplexity"]
        
        return round(score, 3)

@with_progress_tracking
class Coherence(BaseBenchmark):
    def __init__(self):
        self.ppl = PPL()
        #self.snips = SNIPS()
    
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

        return round(ppl_score, 3)