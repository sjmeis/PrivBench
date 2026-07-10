# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import os
import tempfile
import numpy as np
import pandas as pd
from celery.utils.log import get_task_logger
from ..extensions import db
from ..models import PrivatizedDataset

logger = get_task_logger(__name__)

def clean_text(df, text_column='text'):
    if text_column in df.columns:
        df[text_column] = df[text_column].astype(str).str.replace(r'[\r\n]+', ' ', regex=True).str.strip()
    return df

def get_dataset_sequencer_paths(module, submission_id, seed=42):
    """
    Returns a list of dictionaries containing individual sampled temporary file sets
    for each compatible dataset.
    
    Returns:
        List[Dict]: [
            {
                "dataset_name": "imdb",
                "original_path": "/tmp/..._orig.csv",
                "privatized_path": "/tmp/..._priv.csv"
            }, ...
        ]
    """
    compatible_datasets = module.compatible_datasets
    num_datasets = len(compatible_datasets)

    if num_datasets == 0:
        raise ValueError(f"Module {module.name} has no compatible datasets")

    rng = np.random.RandomState(seed)
    
    sequence_manifest = []

    for i, dataset in enumerate(compatible_datasets):
        orig_df = pd.read_csv(dataset.file_path)
        
        priv_dataset = (
            db.session.query(PrivatizedDataset)
            .filter_by(submission_id=submission_id, original_dataset_id=dataset.id)
            .first()
        )
        if not priv_dataset:
            raise ValueError(f"Privatized dataset missing for '{dataset.name}', submission {submission_id}")

        priv_df = pd.read_csv(priv_dataset.file_path)
        total_rows = len(orig_df)

        sampled_orig = clean_text(orig_df.copy(), text_column='text')
        sampled_priv = clean_text(priv_df.copy(), text_column='text')

        temp_dir = tempfile.mkdtemp(prefix=f"privbench_seq_{dataset.name}_")
        orig_path = os.path.join(temp_dir, "original.csv")
        priv_path = os.path.join(temp_dir, "privatized.csv")

        sampled_orig.to_csv(orig_path, index=False)
        sampled_priv.to_csv(priv_path, index=False)

        sequence_manifest.append({
            "dataset_name": dataset.name.replace(".csv", "").strip(),
            "original_path": orig_path,
            "privatized_path": priv_path,
            "temp_dir": temp_dir
        })
        
        logger.info(f"Sequencer staged dataset for execution step: {dataset.name}")

    return sequence_manifest