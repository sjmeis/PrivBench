import evaluate

class PPL():
    def __init__(self, model_checkpoint="gpt2", max_len=512):
        self.ppl = evaluate.load("perplexity", module_type="metric")
        self.model_checkpoint = model_checkpoint
        self.max_len = max_len

    def score(self, data):
        data = [" ".join(x.split()[:self.max_len]) for x in data]
        score = self.ppl.compute(predictions=data, model_id=self.model_checkpoint)["mean_perplexity"]
        return round(score, 3)
    
class Coherence():
    def __init__(self):
        self.ppl = PPL()

    def score(self, original, private):
        o = self.ppl.score(original)
        p = self.ppl.score(private)
        score = max(o / p, 1)
        return round(score, 3)