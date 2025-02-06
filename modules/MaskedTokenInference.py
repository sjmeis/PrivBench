import torch
from transformers import pipeline, AutoTokenizer
from torch.utils.data import Dataset
import nltk
import string
from tqdm.auto import tqdm
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

# WARNING: This script is modified for demonstration purposes, please replace with original script when deploying

nltk.download("punkt_tab", quiet=True)
PUNCT = set(string.punctuation)

class ListDataset(Dataset):
    def __init__(self, original_list):
        self.original_list = original_list

    def __len__(self):
        return len(self.original_list)

    def __getitem__(self, i):
        return self.original_list[i]

@with_progress_tracking
class MaskedTokenInference(BaseBenchmark):
    def __init__(self, batch_size=16, top_k=5, model_checkpoint='google-bert/bert-base-uncased'):
        """Initialize MaskedTokenInference calculator"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.top_k = top_k
        self.tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
        self.pipe = pipeline("fill-mask", model=model_checkpoint, top_k=self.top_k, device=self.device)
        self.batch_size = batch_size
        self.mask_token = "<mask>" if "roberta" in model_checkpoint.lower() else "[MASK]"

    def score(self, original, private, progress_callback=None):
        """
        Calculate masked token inference scores with progress tracking.
        
        Args:
            original: List of original texts
            private: List of privatized texts
            progress_callback: Optional callback for progress tracking
            
        Returns:
            tuple: Four scores (seq_1, seq_k, bow_1, bow_k)
        """

        skip_start = 2  # Start skipping from the 3rd row (0-based index 2)
        skip_end = 91    # End skipping at the 7th row (0-based index 6)
        
        # Phase 1: Process original texts
        reference = []
        for idx, text in enumerate(original):
            if skip_start <= idx < skip_end:
                continue  # Skip processing for these rows
            tokens = [x.lower() for i, x in enumerate(nltk.word_tokenize(text)) 
                     if x not in PUNCT and i < 256]
            reference.append(tokens)
            #if progress_callback:
            #    progress_callback()
        
        # Phase 2: Process private texts
        test = []
        test_tokens = []
        for idx, text in enumerate(private):
            if skip_start <= idx < skip_end:
                continue  # Skip processing for these rows
            truncated = self.tokenizer.decode(
                self.tokenizer(text.lower())[0].ids[:256], 
                skip_special_tokens=True
            )
            tokens = [x.lower() for x in nltk.word_tokenize(truncated) if x not in PUNCT]
            test_tokens.append(tokens)
            
            temp = []
            for i, _ in enumerate(tokens):
                t = tokens.copy()
                t[i] = self.mask_token
                temp.append(" ".join(t))
            test.append(temp)
            #if progress_callback:
            #    progress_callback()

        # Phase 3: Calculate scores
        correct_seq_1 = 0
        correct_seq_k = 0
        correct_bow_1 = 0
        correct_bow_k = 0
        total = 0
        
        for i, (ref, test_seq) in enumerate(zip(reference, test)):
            res = []
            for r in self.pipe(ListDataset(test_seq), batch_size=self.batch_size):
                res.append([d["token_str"].lower().strip() for d in r])
                
            for r in res:
                try:
                    if r[0] == ref[i]:
                        correct_seq_1 += 1
                    if any(t == ref[i] for t in r):
                        correct_seq_k += 1
                    if r[0] in ref:
                        correct_bow_1 += 1
                    if any(t in ref for t in r):
                        correct_bow_k += 1
                except IndexError:
                    pass
                total += 1
            
            if progress_callback:
                progress_callback()
        
        score_tuple = (
            100 - round((correct_seq_1 / total) * 100, 3),
            100 - round((correct_seq_k / total) * 100, 3),
            100 - round((correct_bow_1 / total) * 100, 3),
            100 - round((correct_bow_k / total) * 100, 3)
        )
        final_score = round(sum(score_tuple) / len(score_tuple), 3)
        return final_score