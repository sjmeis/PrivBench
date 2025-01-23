import pandas as pd
import spacy
from collections import Counter
from tqdm.auto import tqdm

spacy.prefer_gpu()

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