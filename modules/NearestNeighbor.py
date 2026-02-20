import torch
from sentence_transformers import SentenceTransformer, util
from tqdm.auto import tqdm
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


@with_progress_tracking
class NearestNeighbor(BaseBenchmark):
    def __init__(self, top_k=1000, model_checkpoint="sentence-transformers/all-MiniLM-L6-v2"):
        """Initialize NearestNeighbor calculator"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.top_k = top_k
    
    def score(self, original, private, progress_callback=None):
        """
        Calculate nearest neighbor score with progress tracking.
        
        Args:
            original: List of original texts
            private: List of privatized texts
            progress_callback: Optional callback for progress tracking
            
        Returns:
            float: Nearest neighbor score
        """
        # First phase: encode all private texts
        priv_embed = self.model.encode(
            private, 
            convert_to_tensor=True, 
            show_progress_bar=False  # Disable built-in progress bar
        )
        priv_embed = priv_embed.to(self.device)
        
        if progress_callback:
            progress_callback()  # Signal completion of private text encoding
        
        found = 0
        total = 0
        
        # Second phase: process original texts
        for i, x in enumerate(original):
            o_embed = self.model.encode(x, convert_to_tensor=True)
            o_embed = o_embed.to(self.device)
            
            # Perform semantic search
            res = util.semantic_search(
                query_embeddings=o_embed, 
                corpus_embeddings=priv_embed, 
                top_k=self.top_k
            )[0]
            
            res = [int(x["corpus_id"]) for x in res]
            try:
                find = res.index(i) + 1
            except ValueError:
                find = self.top_k
            
            # lower is better
            found += find
            total += self.top_k
            
            if progress_callback:
                progress_callback()
        
        return round(found / total, 3)