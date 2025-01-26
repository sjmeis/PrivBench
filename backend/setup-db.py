from app import create_app, db
from app.models import Dataset, BenchmarkModule
from datetime import datetime
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
MODULE_FOLDER = os.path.join(PROJECT_ROOT, "modules")

# Debug logs
logger.info("=== Debug Information ===")
logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
if os.path.exists(DATASET_FOLDER):
    logger.info("Contents of DATASET_FOLDER:")
    logger.info(os.listdir(DATASET_FOLDER))
else:
    logger.error("DATASET_FOLDER does not exist!")

# Initialize the app
app = create_app()

with app.app_context():
    # Drop all tables and recreate them
    # db.drop_all()
    # db.create_all()

    module_names = ['NERpriv']
    module_file_names = ['ner_priv.py']
    module_titles = ['NER Evaluation']
    module_descriptions = []
    module_descriptions.append("On the surface, text privatization should pay particular attention to named entities, or words or groups of words that point to some real-world object, person, organization, etc. Ensuring that such entities are not leaked into the privatized text, while also balancing the preservation of semantics, is the mark of an effective privatization method.")


    # Iterate over all files in the dataset folder
    if os.path.exists(DATASET_FOLDER):
        for i, dataset_name in enumerate(os.listdir(DATASET_FOLDER)):
            file_path = os.path.join(DATASET_FOLDER, dataset_name)
            
            # Check if the file exists and is a file (not a directory)
            if os.path.isfile(file_path):
                logger.info(f"Adding dataset: {dataset_name} at path: {file_path}")
                
                # Create a new Dataset entry
                new_dataset = Dataset(
                    name=dataset_name,
                    file_path=file_path,
                    created_at=datetime.utcnow(),
                    is_active=True
                )

                # Add and commit the new entry to the database
                db.session.add(new_dataset)
                db.session.flush()

                # Dynamically fetch the module name from the list
                module_name = module_names[i % len(module_names)]  # Ensure it wraps around if there are more datasets than modules
                module_title = module_titles[i % len(module_titles)]
                module_file_name = module_file_names[i % len(module_file_names)]
                module_path = os.path.join(MODULE_FOLDER, module_file_name)
                module_description = module_descriptions[i % len(module_descriptions)]

                logger.info(f"Adding module: {module_name} at path: {module_path}")

                new_benchmark_module = BenchmarkModule(
                    name=module_name,
                    title=module_title,
                    description=module_description,
                    version="1.0.0",
                    is_active=True,
                    path=module_path,
                    dataset_id=new_dataset.id
                )
                db.session.add(new_benchmark_module)
        
        # Commit all changes
        db.session.commit()
        logger.info("All datasets and modules have been added to the database.")
    else:
        logger.error("Dataset folder does not exist. Please check the path.")