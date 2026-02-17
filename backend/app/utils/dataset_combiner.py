import os
import tempfile
import numpy as np
import pandas as pd
from celery.utils.log import get_task_logger
from ..extensions import db
from ..models import PrivatizedDataset

logger = get_task_logger(__name__)


def build_combined_datasets(module, submission_id, seed=42):
    """Build combined original and privatized dataset files for a module.

    Samples rows from each compatible dataset proportionally, concatenates
    them, and writes two temp CSV files (original + privatized) with only
    ``id`` and ``text`` columns.

    Args:
        module: BenchmarkModule instance (must have compatible_datasets and sample_count).
        submission_id: ID of the submission whose privatized datasets to use.
        seed: Random seed for reproducible sampling.

    Returns:
        (original_path, privatized_path): Paths to the two temporary CSV files.
    """
    compatible_datasets = module.compatible_datasets
    sample_count = module.sample_count
    num_datasets = len(compatible_datasets)

    if num_datasets == 0:
        raise ValueError(f"Module {module.name} has no compatible datasets")

    per_dataset = sample_count // num_datasets
    remainder = sample_count % num_datasets

    rng = np.random.RandomState(seed)

    original_parts = []
    privatized_parts = []

    for i, dataset in enumerate(compatible_datasets):
        # First dataset gets the remainder
        n_samples = per_dataset + (remainder if i == 0 else 0)

        # Load original CSV
        orig_df = pd.read_csv(dataset.file_path)
        if "text" not in orig_df.columns:
            raise ValueError(
                f"Original dataset '{dataset.name}' is missing 'text' column"
            )

        # Find matching privatized dataset for this submission
        priv_dataset = (
            db.session.query(PrivatizedDataset)
            .filter_by(
                submission_id=submission_id,
                original_dataset_id=dataset.id,
            )
            .first()
        )
        if not priv_dataset:
            raise ValueError(
                f"Privatized dataset not found for dataset '{dataset.name}' "
                f"(id={dataset.id}), submission {submission_id}"
            )

        priv_df = pd.read_csv(priv_dataset.file_path)
        if "text" not in priv_df.columns:
            raise ValueError(
                f"Privatized dataset for '{dataset.name}' is missing 'text' column"
            )

        # Sample same row indices from both
        total_rows = len(orig_df)
        if n_samples > total_rows:
            logger.warning(
                f"Requested {n_samples} samples from {dataset.name} but only "
                f"{total_rows} rows available; using all rows"
            )
            n_samples = total_rows

        indices = rng.choice(total_rows, size=n_samples, replace=False)
        indices.sort()

        original_parts.append(orig_df.iloc[indices][["text"]])
        privatized_parts.append(priv_df.iloc[indices][["text"]])

        logger.info(
            f"Sampled {n_samples} rows from dataset '{dataset.name}' "
            f"(id={dataset.id}) for module '{module.name}'"
        )

    # Concatenate and add sequential id column
    combined_orig = pd.concat(original_parts, ignore_index=True)
    combined_orig.insert(0, "id", range(len(combined_orig)))

    combined_priv = pd.concat(privatized_parts, ignore_index=True)
    combined_priv.insert(0, "id", range(len(combined_priv)))

    # Write to temp files (caller is responsible for cleanup)
    temp_dir = tempfile.mkdtemp(prefix="privbench_combined_")
    original_path = os.path.join(temp_dir, "combined_original.csv")
    privatized_path = os.path.join(temp_dir, "combined_privatized.csv")

    combined_orig.to_csv(original_path, index=False)
    combined_priv.to_csv(privatized_path, index=False)

    logger.info(
        f"Combined datasets for module '{module.name}': "
        f"{len(combined_orig)} rows from {num_datasets} dataset(s)"
    )

    return original_path, privatized_path
