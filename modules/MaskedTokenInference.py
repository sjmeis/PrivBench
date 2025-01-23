import torch
from transformers import pipeline
import nltk
import string
from tqdm.auto import tqdm

nltk.download("punkt", quiet=True)
PUNCT = set(string.punctuation)

class ListDataset(Dataset):
    def __init__(self, original_list):
        self.original_list = original_list

    def __len__(self):
        return len(self.original_list)

    def __getitem__(self, i):
        return self.original_list[i]

class MaskedTokenInference():
    def __init__(self, batch_size=16, top_k=5, model_checkpoint='google-bert/bert-base-uncased'):
        if torch.cuda.is_available() == True:
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

    def score(self, original, private):
        reference = []
        for text in original:
            tokens = [x.lower() for i, x in enumerate(nltk.word_tokenize(text)) if x not in PUNCT and i < 256] 
            reference.append(tokens)

        test = []
        test_tokens = []
        for text in private:
            tokens = [x.lower() for i, x in enumerate(nltk.word_tokenize(text)) if x not in PUNCT and i < 256]
            test_tokens.append(tokens)
            temp = []
            for i, _ in enumerate(tokens):
                t = tokens.copy()
                t[i] = self.mask_token
                temp.append(" ".join(t))
            test.append(temp)

        correct_seq_1 = 0
        correct_seq_k = 0
        correct_bow_1 = 0
        correct_bow_k = 0
        total = 0
        for i, tup in tqdm(enumerate(zip(reference, test)), total=len(reference)):
            res = []
            for r in self.pipe(ListDataset(tup[1]), batch_size=self.batch_size):
                res.append([d["token_str"].lower().strip() for d in r])
            
            for r in res:
                try:
                    if r[0] == tup[0][i]:
                        correct_seq_1 += 1
                    if any(t == tup[0][i] for t in r):
                        correct_seq_k += 1
                    if r[0] in tup[0]:
                        correct_bow_1 += 1
                    if any(t in tup[0] for t in r):
                        correct_bow_k += 1
                except IndexError:
                    pass
                total += 1

        return round(correct_seq_1 / total, 3), round(correct_seq_k / total, 3), round(correct_bow_1 / total, 3), round(correct_bow_k / total, 3)