import torch
from sentence_transformers import SentenceTransformer, util
import evaluate

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