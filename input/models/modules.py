import pandas as pd
import spacy
import torch
from torch.utils.data import Dataset
from collections import Counter
from tqdm.auto import tqdm
from transformers import pipeline, AutoTokenizer
import nltk
import string
from sentence_transformers import SentenceTransformer, util
import evaluate

nltk.download("punkt", quiet=True)
spacy.prefer_gpu()
PUNCT = set(string.punctuation)

class ListDataset(Dataset):
    def __init__(self, original_list):
        self.original_list = original_list

    def __len__(self):
        return len(self.original_list)

    def __getitem__(self, i):
        return self.original_list[i]

class NERpriv():
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")

    def score(self, original, private):
        removed = 0
        total = 0
        for x, y in tqdm(zip(original, private), total=len(original)):
            o_doc = self.nlp(x)
            if pd.isnull(y):
                total += len([x.text for x in o_doc.ents])
                continue
            p_doc = self.nlp(y)

            counts = Counter()
            for ent in o_doc.ents:
                counts[ent.text] += 1

            priv_ents = set()
            for ent in p_doc.ents:
                priv_ents.add(ent.text)
                
            for ent in counts:
                if ent not in priv_ents and ent.lower() not in priv_ents:
                    removed += counts[ent]
                total += counts[ent]

        return round(removed / total, 3)
    

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
    
class NearestNeighbor():
    def __init__(self, top_k=1000, model_checkpoint="thenlper/gte-small"):
        if torch.cuda.is_available() == True:
            self.device = "cuda"
        else:
            self.device = "cpu"

        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.top_k = top_k

    def score(self, original, private):
        priv_embed = self.model.encode(private, convert_to_tensor=True, show_progress_bar=True)
        priv_embed = priv_embed.to(self.device)
        found = 0
        total = 0
        for i, x in tqdm(enumerate(original), total=len(original)):
            o_embed = self.model.encode(x, convert_to_tensor=True)
            o_embed = o_embed.to(self.device)
            res = util.semantic_search(query_embeddings=o_embed, corpus_embeddings=priv_embed, top_k=self.top_k)[0]
            res = [int(x["corpus_id"]) for x in res]
            try:
                find = res.index(i) + 1
            except ValueError:
                find = self.top_k
            
            found += find
            total += 1

        return round(found / total, 3)

class BLEU():
    def __init__(self, normalize=True):
        self.bleu = evaluate.load("bleu")
        self.normalize = normalize

    def score(self, original, private):
        score = self.bleu.compute(predictions=private, references=original)["bleu"]
        if self.normalize == True:
            return max(round(score, 3)*2, 1)
        else:
            return round(score, 3)
    
class CS():
    def __init__(self, model_checkpoint="thenlper/gte-small", progress_bar=False):
        if torch.cuda.is_available() == True:
            self.device = "cuda"
        else:
            self.device = "cpu"

        self.model = SentenceTransformer(model_checkpoint, device=self.device)
        self.progress_bar = progress_bar

    def score(self, original, private):
        orig_embed = self.model.encode(original, convert_to_tensor=True, show_progress_bar=self.progress_bar)
        priv_embed = self.model.encode(private, convert_to_tensor=True, show_progress_bar=self.progress_bar)

        scores = util.pairwise_cos_sim(orig_embed, priv_embed)
        return round(float(scores.mean()), 3)
    
class Similarity():
    def __init__(self, normalize=True, model_checkpoint="thenlper/gte-small", progress_bar=False):
        self.bleu = BLEU(normalize=normalize)
        self.cs = CS(model_checkpoint=model_checkpoint, progress_bar=progress_bar)

    def score(self, original, private):
        b = self.bleu.score(original, private)
        c = self.cs.score(original, private)
        return round((b+c)/2, 3)

class PPL():
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len

    def score(self, data):
        data = [" ".join(x.split()[:self.max_len]) for x in data]
        score = self.ppl.compute(predictions=data, model_id=self.model_checkpoint)["mean_perplexity"]
        return round(score, 3)