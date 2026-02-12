from app import create_app, db
from app.models import Dataset, BenchmarkModule, AppVersion
from app.models.benchmark_module import module_dataset_compatibility
from app.tasks.add_module import install_and_load_module
from datetime import datetime
import os
import logging
import time
import docker

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

DATASET_FOLDER = "/data/datasets"
MODULE_FOLDER = "/app/modules"

logger.info("=== Debug Information ===")
logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
logger.info(f"Attempting to access {DATASET_FOLDER} and {MODULE_FOLDER}")
logger.info("Contents of DATASET_FOLDER:")
logger.info(os.listdir(DATASET_FOLDER))

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

    # ── Datasets ──────────────────────────────────────────────────────────
    dataset_defs = [
        "yelp.csv",
        "imdb.csv",
        "wikitext.csv",
        "glue.csv",
    ]

    datasets = {}
    for dataset_name in dataset_defs:
        file_path = os.path.join(DATASET_FOLDER, dataset_name)

        existing_ds = Dataset.query.filter_by(name=dataset_name).first()
        if existing_ds:
            datasets[dataset_name] = existing_ds
            continue

        if os.path.isfile(file_path):
            logger.info(f"Adding dataset: {dataset_name} at path: {file_path}")
            ds = Dataset(
                name=dataset_name,
                file_path=file_path,
                created_at=datetime.utcnow(),
                is_active=True,
            )
            db.session.add(ds)
            db.session.flush()
            datasets[dataset_name] = ds
        else:
            logger.warning(f"Dataset file not found: {file_path} — skipping")

    # ── Modules ───────────────────────────────────────────────────────────
    # Each entry: (name, file_name, reqs_file, title, description)
    module_defs = [
        (
            "Similarity",
            "Similarity.py",
            "similarity-reqs.txt",
            "Semantic Similarity",
            "Semantic similarity measures the likeness between two pieces of text, commonly used in search engines, clustering, and recommendation tasks.",
        ),
        (
            "MaskedTokenInference",
            "MaskedTokenInference.py",
            "masked-token-reqs.txt",
            "Masked Token Inference Protection",
            "In this module, we test for a privatization method's ability to defend against masked token prediction. Here, an attacker is simulated who attempts to infer tokens from the original text by leveraging the surrounding context. An effective privatization method should therefore not divulge information about the original content given the private context.",
        ),
        (
            "AttributeInference",
            "AttributeInference.py",
            "attribute-inference-reqs.txt",
            "Attribute Inference Protection",
            "This module evaluates whether a privatization method can prevent attribute inference attacks. An attacker uses a text classifier to predict implicit attributes (e.g., sentiment, authorship) from privatized text. Effective privatization should obfuscate these attributes.",
        ),
        (
            "CarliniExposure",
            "CarliniExposure.py",
            "carlini-exposure-reqs.txt",
            "Exposure Defense",
            "This module measures a privatization method's resilience against exposure attacks, where an adversary attempts to determine whether specific text was part of the training data.",
        ),
        (
            "Coherence",
            "Coherence.py",
            "coh-reqs.txt",
            "Text Coherence",
            "This module evaluates the coherence of text, ensuring logical flow and semantic connectivity between sentences and paragraphs.",
        ),
        (
            "LengthRobustness",
            "LengthRobustness.py",
            "length-robustness-reqs.txt",
            "Private Text Length Robustness",
            "This module evaluates how robust a privatization method is across different text lengths, measuring whether privacy guarantees hold for both short and long inputs.",
        ),
        (
            "LengthVariation",
            "LengthVariation.py",
            "length-variation-reqs.txt",
            "Private Text Length Variance",
            "This module measures how much the length of text changes after privatization, assessing the degree of structural alteration introduced by the method.",
        ),
        (
            "Mauve",
            "Mauve.py",
            "mauve-reqs.txt",
            "Distribution Preservation",
            "This module computes the MAUVE score to quantify how well the distribution of privatized text matches the original text distribution.",
        ),
        (
            "NearestNeighbor",
            "NearestNeighbor.py",
            "nearest-neighbor-reqs.txt",
            "Nearest Neighbor Privacy",
            "This module evaluates privacy by checking whether the nearest neighbor of a privatized text is the corresponding original text, indicating potential information leakage.",
        ),
        (
            "NERpriv",
            "NERpriv.py",
            "nerpriv_requirements.txt",
            "Private Entity Masking",
            "Text privatization should pay particular attention to named entities — words or groups of words that point to real-world objects, persons, or organizations. Ensuring that such entities are not leaked into the privatized text, while also balancing the preservation of semantics, is the mark of an effective privatization method.",
        ),
    ]

    # ── Dataset-Module Compatibility Mapping ──────────────────────────────
    compatibility_map = {
        "Similarity":          ["yelp.csv", "glue.csv"],
        "MaskedTokenInference": ["wikitext.csv"],
        "AttributeInference":  ["yelp.csv", "imdb.csv"],
        "CarliniExposure":     ["wikitext.csv"],
        "Coherence":           ["imdb.csv", "wikitext.csv"],
        "LengthRobustness":    ["yelp.csv"],
        "LengthVariation":     ["yelp.csv", "wikitext.csv"],
        "Mauve":               ["yelp.csv", "wikitext.csv"],
        "NearestNeighbor":     ["yelp.csv", "wikitext.csv"],
        "NERpriv":             ["wikitext.csv"],
    }

    modules = {}

    # Create and install modules one-by-one with retries
    for name, file_name, reqs_file, title, description in module_defs:
        module_path = os.path.join(MODULE_FOLDER, file_name)
        requirements_path = os.path.join(MODULE_FOLDER, reqs_file)

        module_record = BenchmarkModule.query.filter_by(name=name).first()

        if module_record and module_record.is_installed:
            logger.info(f"Module {name} already installed. Skipping.")
            modules[name] = module_record
            continue

        if not module_record:
            logger.info(f"Creating record for {name}...")
            module_record = BenchmarkModule(
                name=name,
                title=title,
                description=description,
                version="1.0.0",
                is_active=True,
                path=module_path,
                dataset_id=None,
            )
            db.session.add(module_record)
            db.session.commit()

        modules[name] = module_record

        # Skip rebuild if Docker image already exists
        image_tag = f"module-{name.lower()}"
        try:
            docker_client = docker.from_env()
            docker_client.images.get(image_tag)
            logger.info(f"Docker image '{image_tag}' already exists. Skipping build for {name}.")
            module_record.is_installed = True
            db.session.commit()
            continue
        except docker.errors.ImageNotFound:
            logger.info(f"Docker image '{image_tag}' not found. Will build {name}.")
        except Exception as e:
            logger.warning(f"Could not check Docker image for {name}: {e}. Will attempt build.")

        # Safe installation loop with retries and delay
        success = False
        retries = 3
        while retries > 0 and not success:
            logger.info(f"Installing {name} (Attempt {4-retries}/3)...")
            try:
                task = install_and_load_module.delay(
                    module_id=module_record.id,
                    module_name=name,
                    module_path=module_record.path,
                    requirements_path=requirements_path,
                )

                result = task.get(timeout=600)
                if result.get("status") == "success":
                    logger.info(f"Successfully installed {name}")
                    success = True
                else:
                    logger.error(f"Installation failed for {name}: {result.get('message')}")
                    retries -= 1
                    if retries > 0:
                        logger.info("Waiting 10s before retry...")
                        time.sleep(10)
            except Exception as e:
                logger.error(f"Error during installation of {name}: {e}")
                retries -= 1
                time.sleep(10)

        if not success:
            logger.error(f"Module {name} could not be installed after 3 attempts.")

        # Pause between modules to let the Docker Engine breathe
        logger.info("Cooling down Docker Engine for 5s...")
        time.sleep(5)

    # Populate compatibility junction table
    for module_name, dataset_names in compatibility_map.items():
        if module_name not in modules:
            continue
        module = modules[module_name]
        for ds_name in dataset_names:
            if ds_name in datasets:
                db.session.execute(
                    module_dataset_compatibility.insert().values(
                        module_id=module.id,
                        dataset_id=datasets[ds_name].id,
                    )
                )
                logger.info(f"  {module_name} <-> {ds_name}")
            else:
                logger.warning(
                    f"Dataset {ds_name} not found for compatibility with {module_name}"
                )

    db.session.commit()

    logger.info("All datasets and modules have been added to the database.")
    logger.info(
        "All modules have been installed successfully. Docker images are ready."
    )
