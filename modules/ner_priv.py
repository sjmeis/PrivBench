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
        print("Initialized NERpriv with SpaCy model")

    def process_row(self, original_row, private_row):
        removed = 0
        total = 0

        # Convert all texts to strings and concatenate them
        original_text = " ".join(str(text) if pd.notnull(text) else "" for text in original_row)
        private_text = " ".join(str(text) if pd.notnull(text) else "" for text in private_row)

        # Process the concatenated texts
        o_doc = self.nlp(original_text)
        p_doc = self.nlp(private_text)

        if not p_doc.text.strip():  # If private text is empty
            total += len(o_doc.ents)
            return removed, total

        o_ents = {ent.text.lower() for ent in o_doc.ents}
        p_ents = {ent.text.lower() for ent in p_doc.ents}

        removed += len(o_ents - p_ents)
        total += len(o_ents)

        return removed, total

    def score(self, original_df, private_df):
        """
        Calculate privacy score based on named entity removal.
        
        Args:
            original_df (pd.DataFrame): Original dataset
            private_df (pd.DataFrame): Privatized dataset
            
        Returns:
            float: Privacy score (0-100)
        """
        removed = 0
        total = 0
        
        print(f"Processing {len(original_df)} rows")
        print(f"Original DataFrame columns: {original_df.columns}")
        print(f"Private DataFrame columns: {private_df.columns}")
        
        # Convert DataFrames to lists of rows
        original_rows = original_df.values
        private_rows = private_df.values
        
        for idx, (original_row, private_row) in enumerate(tqdm(zip(original_rows, private_rows), total=len(original_rows))):
            if idx == 0:  # Print sample of first row
                print(f"\nSample of first row processing:")
                print(f"Original: {' '.join(str(x) for x in original_row[:100])}")
                print(f"Private: {' '.join(str(x) for x in private_row[:100])}")
            
            r, t = self.process_row(original_row, private_row)
            removed += r
            total += t
            
            if idx % 1000 == 0 and total > 0:  # Print progress every 1000 rows
                current_score = round((removed / total) * 100, 2)
                print(f"\nIntermediate score at row {idx}: {current_score}%")
                print(f"Entities removed: {removed}, Total entities: {total}")

        final_score = round((removed / total) * 100, 2) if total > 0 else 0.0
        print(f"\nFinal statistics:")
        print(f"Total entities found: {total}")
        print(f"Entities removed: {removed}")
        print(f"Final score: {final_score}%")
        
        return final_score