import pandas as pd
import spacy
from tqdm.auto import tqdm

# Try to use GPU if available, fallback to CPU otherwise
try:
    spacy.prefer_gpu()
    gpu_available = spacy.require_gpu()
    print("GPU is available and will be used.")
except Exception as e:
    gpu_available = False
    print("GPU is not available. Falling back to CPU.")

class NERpriv:
    def __init__(self):
        # Load SpaCy model with unnecessary components disabled
        self.nlp = spacy.load("en_core_web_sm", disable=["tagger", "parser", "attribute_ruler", "lemmatizer"])

    def process_row(self, original_row, private_row):
        removed = 0
        total = 0

        # Convert all texts to strings
        original_texts = [str(text) if pd.notnull(text) else "" for text in original_row]
        private_texts = [str(text) if pd.notnull(text) else "" for text in private_row]

        # Process texts in manageable batch sizes
        o_docs = list(self.nlp.pipe(original_texts, batch_size=16))
        p_docs = list(self.nlp.pipe(private_texts, batch_size=16))

        for o_doc, p_doc in zip(o_docs, p_docs):
            if not p_doc.text.strip():  # If private text is empty
                total += len(o_doc.ents)
                continue

            o_ents = {ent.text.lower() for ent in o_doc.ents}
            p_ents = {ent.text.lower() for ent in p_doc.ents}

            removed += len(o_ents - p_ents)
            total += len(o_ents)

        return removed, total

    def score(self, original_rows, private_rows):
        removed = 0
        total = 0

        for original_row, private_row in tqdm(zip(original_rows, private_rows), total=len(original_rows)):
            r, t = self.process_row(original_row, private_row)
            removed += r
            total += t

        return round((removed / total) * 100) if total > 0 else 0.0