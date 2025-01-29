import torch
from sentence_transformers import SentenceTransformer, util
from tqdm.auto import tqdm

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