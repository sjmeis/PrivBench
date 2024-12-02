from app import create_app, db
from app.models import Dataset
from datetime import datetime
from app.extensions import db
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")

# Construct full file path
dataset_name = "priv1.csv"
file_path = os.path.join(DATASET_FOLDER, dataset_name)

# Debug logs
logger.info("=== Debug Information ===")
logger.info(f"Looking for file at: {file_path}")
logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
logger.info(f"File exists: {os.path.exists(file_path)}")

# List contents of DATASET_FOLDER
logger.info("Contents of DATASET_FOLDER:")
if os.path.exists(DATASET_FOLDER):
    logger.info(os.listdir(DATASET_FOLDER))
else:
    logger.info("DATASET_FOLDER does not exist!")

# Check if the dataset file exists
if not os.path.exists(file_path):
    logger.error(f"File not found at path: {file_path}")

app = create_app()

with app.app_context():
    # Drop all tables and recreate them
    #db.drop_all()
    #db.create_all()
    # Create a new Dataset entry
    new_dataset = Dataset(
        name=dataset_name,
        file_path=file_path,
        created_at=datetime.utcnow(),
        is_active=True
    )

    # Add and commit the new entry to the database
    db.session.add(new_dataset)
    db.session.commit()