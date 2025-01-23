import pandas as pd
from pathlib import Path

def load_dataset(file_path):
    """
    Load dataset from a CSV file in the specified data folder.

    Returns:
        pd.DataFrame: A Pandas DataFrame containing the dataset.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file '{file_path}' not found.")

    return pd.read_csv(file_path)
