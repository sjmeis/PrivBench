import pandas as pd
import spacy
from collections import Counter
from tqdm.auto import tqdm
from base_benchmark import BaseBenchmark
import time
import random

spacy.prefer_gpu()

class NERpriv(BaseBenchmark):

    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")

    def score(self, original, private):
        removed = 0
        total = 0
        for x, y in tqdm(zip(original, private), total=len(original)):
            o_doc = self.nlp(x)
            if pd.isnull(y):
                total += len([x.text for x in o_doc.ents])
                # Adding a random sleep time between 0.1 and 1 second
                time.sleep(random.uniform(1, 5))
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
            
            # Adding a random sleep time between 0.1 and 1 second after processing each pair
            time.sleep(random.uniform(1, 5))

        if total == 0:
            return 0.0  

        # Return the score as a percentage, rounded to 2 decimal places
        return round((removed / total) * 100)
