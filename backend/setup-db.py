from app import create_app, db
from app.models import Dataset, BenchmarkModule, AppVersion
from app.tasks.add_module import install_and_load_module
from datetime import datetime
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
# DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
# MODULE_FOLDER = os.path.join(PROJECT_ROOT, "modules")

DATASET_FOLDER = "/data/datasets"
MODULE_FOLDER = "/app/modules"

# Debug logs
logger.info("=== Debug Information ===")
logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
logger.info(f"Attempting to access {DATASET_FOLDER} and {MODULE_FOLDER}")
# if os.path.exists(DATASET_FOLDER):
logger.info("Contents of DATASET_FOLDER:")
logger.info(os.listdir(DATASET_FOLDER))
# else:
#     logger.error("DATASET_FOLDER does not exist!")

# Initialize the app
app = create_app()

with app.app_context():
    # Drop all tables and recreate them
    #db.drop_all()
    db.create_all()

    # Initialize app version
    initial_version = AppVersion(version="1.0.0")
    db.session.add(initial_version)
    db.session.commit()
    logger.info("Initialized app version to 1.0.0")

    module_names = [
        "AttributeInference",
        "CarliniExposure",
        "Coherence",
        "LengthRobustness",
        "LengthVariation",
        "MaskedTokenInference",
        "Mauve",
        "NearestNeighbor",
        "NERpriv",
        "Similarity",
    ]
    module_file_names = [
        "AttributeInference.py",
        "CarliniExposure.py",
        "Coherence.py",
        "LengthRobustness.py",
        "LengthVariation.py",
        "MaskedTokenInference.py",
        "Mauve.py",
        "NearestNeighbor.py",
        "NERpriv.py",
        "Similarity.py",
    ]
    module_requirement_file_names = [
        "attribute-inference-reqs",
        "carlini-exposure-reqs",
        "coh-reqs.txt",
        "length-robustness-reqs",
        "length-variation-reqs",
        "masked-token-reqs.txt",
        "mauve-reqs",
        "nearest-neighbor-reqs.txt",
        "ner_requirements.txt",
        "similarity-reqs.txt",
    ]
    dataset_names = [
        "demo_nerpriv.csv",
        "demo_coherence.csv",
        "demo_nearestneighbor.csv",
        "demo_similarity.csv",
        "demo_maskedtokeninf.csv",
    ]

    module_titles = [
        "Attribute Inference Protection",
        "Exposure Defense",
        "Text Coherence",
        "Private Text Length Robustness",
        "Private Text Length Variance",
        "Masked Token Inference Protection",
        "Distribution Preservation",
        "Nearest Neighbor Privacy",
        "Private Entity Masking",
        "Semantic Similarity",
    ]

    module_descriptions = [
        "Attribute. Test.",
        "Exposure. Test.",
        "This module evaluates the coherence of text, ensuring logical flow and semantic connectivity between sentences and paragraphs.",
        "Robustness. Test.",
        "Variance. Test.",
        "In this module, we test for a privatization method's ability to defend against masked token prediction. Here, an attacker is simulated who attempts to infer tokens from the original text by leveraging the surrounding context. An effective privatization method should therefore not divulge information about the original content given the private context.",
        "MAUVE. Test.",
        "TN. Test.",
        "On the surface, text privatization should pay particular attention to named entities, or words or groups of words that point to some real-world object, person, organization, etc. Ensuring that such entities are not leaked into the privatized text, while also balancing the preservation of semantics, is the mark of an effective privatization method.",
        "Semantic similarity measures the likeness between two pieces of text, commonly used in search engines, clustering, and recommendation tasks.",
    ]

    # Create a dictionary to store datasets
    datasets = {}
    install_tasks = []  # Store tasks to wait for them

    # Iterate over all files in the dataset folder
    #if os.path.exists(DATASET_FOLDER) and os.path.exists(MODULE_FOLDER):
    # First create all datasets
    for dataset_name in dataset_names:
        file_path = os.path.join(DATASET_FOLDER, dataset_name)
        if os.path.isfile(file_path):
            logger.info(f"Adding dataset: {dataset_name} at path: {file_path}")

            new_dataset = Dataset(
                name=dataset_name,
                file_path=file_path,
                created_at=datetime.utcnow(),
                is_active=True,
            )

            db.session.add(new_dataset)
            db.session.flush()
            datasets[dataset_name] = new_dataset

    # Then create all modules
    for i, module_name in enumerate(module_names):
        module_title = module_titles[i]
        module_file_name = module_file_names[i]
        module_path = os.path.join(MODULE_FOLDER, module_file_name)
        module_description = module_descriptions[i]
        requirements_file_name = module_requirement_file_names[i]
        requirements_path = os.path.join(MODULE_FOLDER, requirements_file_name)
        corresponding_dataset = dataset_names[i]

        logger.info(f"Adding module: {module_name} at path: {module_path}")

        if corresponding_dataset in datasets:
            new_benchmark_module = BenchmarkModule(
                name=module_name,
                title=module_title,
                description=module_description,
                version="1.0.0",
                is_active=True,
                path=module_path,
                dataset_id=datasets[corresponding_dataset].id,
            )

            install_task = install_and_load_module.delay(
                module_id=new_benchmark_module.id,
                module_name=module_name,
                module_path=module_path,
                requirements_path=requirements_path,
            )
            install_tasks.append(install_task)  # Store the task
            db.session.add(new_benchmark_module)
            logger.info(f"Module {module_name} queued for installation")
        else:
            logger.error(
                f"Dataset {corresponding_dataset} not found for module {module_name}"
            )

    db.session.commit()

    # Wait for all installation tasks to complete
    logger.info("Waiting for all module installations to complete...")
    for i, task in enumerate(install_tasks):
        module_name = module_names[i]
        logger.info(f"Waiting for {module_name} installation...")

        try:
            result = task.get(timeout=600)  # 10 minute timeout per module
            if result["status"] == "success":
                logger.info(f"Module {module_name} installed successfully")
            else:
                logger.error(
                    f"Module {module_name} installation failed: {result['message']}"
                )
                raise Exception(f"Module {module_name} installation failed")
        except Exception as e:
            logger.error(f"Failed to install module {module_name}: {e}")
            raise

    logger.info("All datasets and modules have been added to the database.")
    logger.info(
        "All modules have been installed successfully. Docker images are ready."
    )
    #else:
    #    logger.error("Dataset folder does not exist. Please check the path.")
