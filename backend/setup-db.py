from app import create_app, db
from app.models import Dataset, BenchmarkModule
from datetime import datetime
import os
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Optionally use an environment variable to set the project root directory
PROJECT_ROOT = os.getenv("PROJECT_ROOT", None)

# If the environment variable is not set, attempt to auto-discover the project root
if PROJECT_ROOT is None:
    PROJECT_ROOT = Path(__file__).resolve().parents[1]  # 3 levels up from the current script

# Define paths based on the discovered project root
DATASET_FOLDER = Path(PROJECT_ROOT) / "data" / "datasets"
MODULE_FOLDER = Path(PROJECT_ROOT) / "modules"

# Debug logs
logger.info("=== Debug Information ===")
logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
if DATASET_FOLDER.exists():
    logger.info("Contents of DATASET_FOLDER:")
    logger.info(os.listdir(DATASET_FOLDER))
else:
    logger.error(f"DATASET_FOLDER does not exist: {DATASET_FOLDER}")

# Initialize the app
app = create_app()

with app.app_context():
    # Drop all tables and recreate them (optional, uncomment if needed)
    # db.drop_all()
    # db.create_all()

    # Iterate over all files in the dataset folder
    if DATASET_FOLDER.exists():
        for dataset_name in os.listdir(DATASET_FOLDER):
            file_path = DATASET_FOLDER / dataset_name
            
            # Check if the file exists and is a file (not a directory)
            if file_path.is_file():
                logger.info(f"Adding dataset: {dataset_name} at path: {file_path}")
                
                # Create a new Dataset entry
                new_dataset = Dataset(
                    name=dataset_name,
                    file_path=str(file_path),
                    created_at=datetime.utcnow(),
                    is_active=True
                )

                # Add and commit the new entry to the database
                db.session.add(new_dataset)
                db.session.flush()

                module_name = "NERpriv"
                module_file_name = "ner_priv.py"
                module_path = MODULE_FOLDER / module_file_name
                module_description = "This is a description on how NERpriv works and what it evaluates"

                new_benchmark_module = BenchmarkModule(
                    name=module_name,
                    description=module_description,
                    version="1.0.0",
                    is_active=True,
                    path=str(module_path),
                    dataset_id=new_dataset.id
                )
                db.session.add(new_benchmark_module)
        # Commit all changes
        db.session.commit()
        logger.info("All datasets and modules have been added to the database.")
    else:
        logger.error(f"Dataset folder does not exist. Please check the path: {DATASET_FOLDER}")
