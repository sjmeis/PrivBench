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

    def score(self, original_df, private_df, progress_callback=None):
        """Calculate privacy score based on named entity removal."""
        removed = 0
        total = 0
        total_rows = len(original_df)
        
        # Convert DataFrames to lists of rows
        original_rows = original_df.values
        private_rows = private_df.values
        
        for idx, (original_row, private_row) in enumerate(tqdm(zip(original_rows, private_rows), 
                                                             total=total_rows,
                                                             desc="Processing rows")):
            # Process the row
            r, t = self.process_row(original_row, private_row)
            removed += r
            total += t
            
            # Update progress every 100 rows or when requested
            if progress_callback and (idx % 100 == 0 or idx == total_rows - 1):
                progress_callback(idx + 1)
            
            # Calculate and print intermediate scores
            if idx % max(1, min(1000, total_rows // 10)) == 0:
                current_score = round((removed / total) * 100, 2) if total > 0 else 0.0
                print(f"\nProgress: {idx}/{total_rows} rows ({(idx/total_rows*100):.1f}%)")
                print(f"Current score: {current_score}%")

        final_score = round((removed / total) * 100, 2) if total > 0 else 0.0
        
        return final_score