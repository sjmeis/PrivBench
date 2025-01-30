import torch
from torch.utils.data import Dataset
from transformers import pipeline
import nltk
import string
from tqdm.auto import tqdm

PUNCT = set(string.punctuation)
nltk.download("punkt_tab", quiet=True)

class ListDataset(Dataset):
    def __init__(self, original_list):
        self.original_list = original_list

    def __len__(self):
        return len(self.original_list)

    def __getitem__(self, i):
        return self.original_list[i]

class ProgressTracker:
    """Utility class for progress tracking and intermediate reporting."""
    def __init__(self, total_steps, progress_callback=None):
        self.total_steps = total_steps
        self.progress_callback = progress_callback
        self.last_reported = 0

    def update(self, current_step):
        if self.progress_callback:
            self.progress_callback(current_step)
        progress = (current_step / self.total_steps) * 100
        if progress - self.last_reported >= 10:  # Report every 10%
            print(f"Progress: {current_step}/{self.total_steps} ({progress:.1f}%)")
            self.last_reported = progress


class MaskedTokenInference:
    def __init__(self, batch_size=16, top_k=5, model_checkpoint="google-bert/bert-base-uncased"):
        if torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"

        self.top_k = top_k
        self.pipe = pipeline("fill-mask", model=model_checkpoint, top_k=self.top_k, device=self.device)
        self.batch_size = batch_size
        if "roberta" in model_checkpoint.lower():
            self.mask_token = "<mask>"
        else:
            self.mask_token = "[MASK]"

    def score(self, original, private, progress_callback=None):
        reference = []
        max_seq_len = 512  # Max sequence length for BERT

        for text in original:
            tokens = [
                x.lower()
                for i, x in enumerate(nltk.word_tokenize(text))
                if x not in PUNCT and i < max_seq_len
            ]
            reference.append(tokens)

        test = []
        test_tokens = []
        for text in private:
            tokens = [
                x.lower()
                for i, x in enumerate(nltk.word_tokenize(text))
                if x not in PUNCT and i < max_seq_len
            ]
            test_tokens.append(tokens)
            temp = []
            for i, _ in enumerate(tokens):
                t = tokens.copy()
                t[i] = self.mask_token
                temp.append(" ".join(t[:max_seq_len]))  # Ensure truncation
            test.append(temp)

        correct_seq_1 = 0
        correct_seq_k = 0
        correct_bow_1 = 0
        correct_bow_k = 0
        total = 0

        # Initialize progress tracker
        tracker = ProgressTracker(total_steps=len(reference), progress_callback=progress_callback)

        for i, (ref_tokens, test_masks) in tqdm(enumerate(zip(reference, test)), total=len(reference), desc="Scoring"):
            res = []
            for r in self.pipe(ListDataset(test_masks), batch_size=self.batch_size):
                res.append([d["token_str"].lower().strip() for d in r])

            for r in res:
                try:
                    if r[0] == ref_tokens[i]:
                        correct_seq_1 += 1
                    if any(t == ref_tokens[i] for t in r):
                        correct_seq_k += 1
                    if r[0] in ref_tokens:
                        correct_bow_1 += 1
                    if any(t in ref_tokens for t in r):
                        correct_bow_k += 1
                except IndexError:
                    pass
                total += 1

            # Update progress tracker
            tracker.update(i + 1)

        average = round(sum([
            correct_seq_1 / total * 100,
            correct_seq_k / total * 100, 
            correct_bow_1 / total * 100,
            correct_bow_k / total * 100
        ]) / 4, 3)

        return average
