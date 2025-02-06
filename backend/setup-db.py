from app import create_app, db
from app.models import Dataset, BenchmarkModule
from app.tasks.add_module import install_and_load_module
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
    db.drop_all()
    db.create_all()

    module_names = ['NERpriv', 'Coherence', 'NearestNeighbor', 'Similarity', 'MaskedTokenInference']
    module_file_names = ['NERpriv.py', 'Coherence.py',  'NearestNeighbor.py', 'Similarity.py', 'MaskedTokenInference.py']
    module_requirement_file_names = [
        'ner_requirements.txt', 'coh-reqs.txt',
        'nearest-neighbor-reqs.txt', 'similarity-reqs.txt',
        'masked-token-reqs.txt'
    ]

    module_titles = [
        'NER Evaluation', 'Text Coherence',
        'Nearest Neighbor Search', 'Text Similarity',
        'Masked Token Inference'
    ]
    module_descriptions = [
        "On the surface, text privatization should pay particular attention to named entities, or words or groups of words that point to some real-world object, person, organization, etc. Ensuring that such entities are not leaked into the privatized text, while also balancing the preservation of semantics, is the mark of an effective privatization method.",
        "This module evaluates the coherence of text, ensuring logical flow and semantic connectivity between sentences and paragraphs.",
        "The nearest neighbor module enables efficient searching for the closest data points, useful in "
        "classification and recommendation systems.",
        "Text similarity measures the likeness between two pieces of text, commonly used in search engines, clustering, and recommendation tasks.",
        "In this module, we test for a privatization method's ability to defend against masked token prediction. Here, an attacker is simulated who attempts to infer tokens from the original text by leveraging the surrounding context. An effective privatization method should therefore not divulge information about the original content given the private context.",
    ]
    dataset_name = 'test_original.csv'

    # Iterate over all files in the dataset folder
    if os.path.exists(DATASET_FOLDER) and os.path.exists(MODULE_FOLDER):

        file_path = os.path.join(DATASET_FOLDER, dataset_name)
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

        for i, module_name in enumerate(module_names):

            module_name = module_names[i % len(module_names)]
            module_title = module_titles[i % len(module_titles)]
            module_file_name = module_file_names[i % len(module_file_names)]
            module_path = os.path.join(MODULE_FOLDER, module_file_name)
            module_description = module_descriptions[i % len(module_descriptions)]
            requirements_file_name = module_requirement_file_names[i % len(module_requirement_file_names)]
            requirements_path = os.path.join(MODULE_FOLDER, requirements_file_name)

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

            install_task = install_and_load_module.delay(
                module_id=new_benchmark_module.id,
                module_name=module_name,
                module_path=module_path,
                requirements_path=requirements_path
            )

            db.session.add(new_benchmark_module)

            logger.info(f"Module {module_name} installed successfully")

        db.session.commit()
        logger.info("All datasets and modules have been added to the database.")
    else:
        logger.error("Dataset folder does not exist. Please check the path.")