from app import create_app, db
from app.models import Dataset, BenchmarkModule, AppVersion
from app.tasks.add_module import install_and_load_module
from datetime import datetime
import os
import logging
import time

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
    #db.create_all()

    # Initialize app version
    if not AppVersion.query.filter_by(version="1.0.0").first():
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
        "Similarity"
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
        "attribute-inference-reqs.txt",
        "carlini-exposure-reqs.txt",
        "coh-reqs.txt",
        "length-robustness-reqs.txt",
        "length-variation-reqs.txt",
        "masked-token-reqs.txt",
        "mauve-reqs.txt",
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
        "Semantic similarity measures the likeness between two pieces of text, commonly used in search engines, clustering, and recommendation tasks."
    ]

    module_requires_gpu = [
        True, # AttributeInference 
        True,  # CarliniExposure 
        True, # Coherence
        False, # LengthRobustness
        False, # LengthVariation
        True,  # MaskedTokenInference 
        True,  # Mauve
        True, # NearestNeighbor
        False, # NERpriv
        True  # Similarity
    ]

    # Create a dictionary to store datasets
    datasets = {}
    install_tasks = []  # Store tasks to wait for them

    # Iterate over all files in the dataset folder
    #if os.path.exists(DATASET_FOLDER) and os.path.exists(MODULE_FOLDER):
    # First create all datasets
    unique_dataset_names = list(set(dataset_names))
    for dataset_name in unique_dataset_names:
        file_path = os.path.join(DATASET_FOLDER, dataset_name)

        existing_ds = Dataset.query.filter_by(name=dataset_name).first()
        if existing_ds:
            datasets[dataset_name] = existing_ds
            continue

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

    # 2. Create and Install Modules One-by-One
    for i, module_name in enumerate(module_names):
        module_record = BenchmarkModule.query.filter_by(name=module_name).first()
        
        if module_record and module_record.is_installed:
            logger.info(f"Module {module_name} already installed. Skipping.")
            continue
        
        if not module_record:
            logger.info(f"Creating record for {module_name}...")
            module_record = BenchmarkModule(
                name=module_name,
                title=module_titles[i],
                description=module_descriptions[i],
                version="1.0.0",
                is_active=True,
                path=os.path.join(MODULE_FOLDER, module_file_names[i]),
                dataset_id=datasets[dataset_names[i]].id,
                use_gpu=module_requires_gpu[i]
            )
            db.session.add(module_record)
            db.session.commit()

        # 3. Safe Installation Loop with Retries and Delay
        success = False
        retries = 3
        while retries > 0 and not success:
            logger.info(f"Installing {module_name} (Attempt {4-retries}/3)...")
            try:
                task = install_and_load_module.delay(
                    module_id=module_record.id,
                    module_name=module_name,
                    module_path=module_record.path,
                    requirements_path=os.path.join(MODULE_FOLDER, module_requirement_file_names[i]),
                    use_gpu=module_requires_gpu[i]
                )
                
                result = task.get(timeout=600)
                if result.get("status") == "success":
                    logger.info(f"Successfully installed {module_name}")
                    success = True
                else:
                    logger.error(f"Installation failed for {module_name}: {result.get('message')}")
                    retries -= 1
                    if retries > 0:
                        logger.info("Waiting 10s before retry...")
                        time.sleep(10)
            except Exception as e:
                logger.error(f"Error during installation of {module_name}: {e}")
                retries -= 1
                time.sleep(10)

        if not success:
            logger.error(f"Module {module_name} could not be installed after 3 attempts.")
            # Depending on requirements, you can choose to exit or continue
            # raise Exception(f"Fatal error installing {module_name}")

        # CRITICAL: Pause between modules to let the Docker Engine "breathe"
        logger.info("Cooling down Docker Engine for 5s...")
        time.sleep(5)