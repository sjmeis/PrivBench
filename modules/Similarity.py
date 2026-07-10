# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import torch
from sentence_transformers import SentenceTransformer, util
import evaluate
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


class BLEU:
    def __init__(self, normalize=True):
        """Initialize BLEU scorer"""
        self.bleu = evaluate.load("bleu")
        self.normalize = normalize
    
    def score(self, original, private, internal_progress_callback=None):
        """Calculate BLEU score with progress tracking"""
        score = self.bleu.compute(predictions=private, references=original)["bleu"]
        
        if internal_progress_callback:
            internal_progress_callback()
            
        if self.normalize:
            return max(round(score, 3) * 2, 1)
        return round(score, 3)

class CS:
    def __init__(self, model_checkpoint="sentence-transformers/all-MiniLM-L6-v2", progress_bar=False):
        """Initialize Cosine Similarity scorer"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.progress_bar = progress_bar
    
    def score(self, original, private, internal_progress_callback=None):
        """Calculate Cosine Similarity score with progress tracking"""
        # Encode original texts
        orig_embed = self.model.encode(
            original, 
            convert_to_tensor=True, 
            show_progress_bar=False  # We'll handle progress tracking ourselves
        )
        if internal_progress_callback:
            internal_progress_callback()
            
        # Encode private texts
        priv_embed = self.model.encode(
            private, 
            convert_to_tensor=True, 
            show_progress_bar=False
        )
        if internal_progress_callback:
            internal_progress_callback()
            
        scores = util.pairwise_cos_sim(orig_embed, priv_embed)
        return round(float(scores.mean()), 3)

@with_progress_tracking
class Similarity(BaseBenchmark):
    def __init__(self, normalize=True, model_checkpoint="sentence-transformers/all-MiniLM-L6-v2", progress_bar=False, **kwargs):
        """Initialize Similarity calculator using BLEU and CS"""
        super().__init__(**kwargs)
        self.bleu = BLEU(normalize=normalize)
        self.cs = CS(model_checkpoint=model_checkpoint, progress_bar=progress_bar)
    
    def score(self, original, private, progress_callback=None):
        """
        Calculate combined similarity score with progress tracking.
        
        Args:
            original: List of original texts
            private: List of privatized texts
            progress_callback: Optional callback for progress tracking
            
        Returns:
            float: Combined similarity score
        """
        total_steps = 4  # BLEU + CS (2 encoding steps)
        steps_completed = 0
        
        def internal_progress_handler():
            nonlocal steps_completed
            steps_completed += 1
            if progress_callback and (steps_completed % 1 == 0 or steps_completed == total_steps):
                progress_callback()
        
        # Calculate BLEU score
        b = self.bleu.score(original, private, internal_progress_callback=internal_progress_handler)
        
        # Calculate Cosine Similarity score
        c = self.cs.score(original, private, internal_progress_callback=internal_progress_handler)
        
        sim_score = round(((b + c) * 100) / 2, 3)
        if sim_score > 100:
            sim_score = 100
        return sim_score
