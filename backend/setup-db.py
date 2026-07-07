from app import create_app, db
from app.models import Dataset, BenchmarkModule, AppVersion, ModuleUpdate
from app.models.benchmark_module import module_dataset_compatibility
from app.tasks.add_module import install_and_load_module
from app.utils.container_manager import module_image_tag
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
    # db.drop_all()
    db.create_all()

    # ── Datasets ──────────────────────────────────────────────────────────
    dataset_defs = [
        "yelp.csv",
        "imdb.csv",
        "wikitext.csv",
        #"glue.csv",
        "reddit.csv",
        "pubmedqa.csv",
        "tab.csv"
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
    # Each entry: (name, file_name, reqs_file, title, description, use_gpu)
    module_defs = [
        (
            "Similarity",
            "Similarity.py",
            "similarity-reqs.txt",
            "Semantic Similarity",
            "Semantic similarity measures the semantic likeness between two pieces of text, which is a signal of utility preservation in text privatization.",
            True,
        ),
        (
            "MaskedTokenInference",
            "MaskedTokenInference.py",
            "masked-token-reqs.txt",
            "Masked Token Inference Protection",
            "In this module, we test for a privatization method's ability to defend against masked token prediction. Here, an attacker is simulated who attempts to infer tokens from the original text by leveraging the surrounding context. An effective privatization method should therefore not divulge information about the original content given the private context.",
            True,
        ),
        (
            "AttributeInference",
            "AttributeInference.py",
            "attribute-inference-reqs.txt",
            "Attribute Inference Protection",
            "This module evaluates whether a privatization method can prevent attribute inference attacks. An attacker uses a text classifier to predict implicit attributes (e.g., authorship) from privatized text. Effective privatization should obfuscate these attributes.",
            True,
        ),
        (
            "Coherence",
            "Coherence.py",
            "coh-reqs.txt",
            "Text Coherence",
            "This module evaluates the coherence of text, ensuring logical flow and semantic connectivity within the text.",
            True,
        ),
        (
            "LengthRobustness",
            "LengthRobustness.py",
            "length-robustness-reqs.txt",
            "Private Text Length Robustness",
            "This module evaluates how robust a privatization method is across different text lengths, measuring whether privacy protections hold for both short and long inputs.",
            False,
        ),
        (
            "LengthVariation",
            "LengthVariation.py",
            "length-variation-reqs.txt",
            "Private Text Length Variance",
            "This module measures how much the length of text changes after privatization, assessing the degree of structural alteration introduced by the method.",
            False,
        ),
        (
            "Mauve",
            "Mauve.py",
            "mauve-reqs.txt",
            "Distribution Preservation",
            "This module computes the MAUVE score to quantify how well the distribution of privatized text matches the original text distribution.",
            True,
        ),
        (
            "NearestNeighbor",
            "NearestNeighbor.py",
            "nearest-neighbor-reqs.txt",
            "Nearest Neighbor Privacy",
            "This module evaluates privacy by checking whether the nearest neighbor of a privatized text is the corresponding original text, indicating potential information leakage.",
            True,
        ),
        (
            "NERpriv",
            "NERpriv.py",
            "nerpriv-reqs.txt",
            "Private Entity Masking",
            "Text privatization should pay particular attention to named entities — words or groups of words that point to real-world objects, persons, or organizations. Ensuring that such entities are not leaked into the privatized text, while also balancing the preservation of semantics, is the mark of an effective privatization method.",
            False,
        ),
        (
            "UtilityPreservation",
            "UtilityPreservation.py",
            "utility-preservation-reqs.txt",
            "Downstream Utility Preservation",
            "While privacy is very important, privatized texts should also maintain usability in downstream tasks, e.g., with sentiment analysis or question answering. This module evaluates the degree to which downstream task performance is preserved.",
            True,
        ),
    ]

    # ── Dataset-Module Compatibility Mapping ──────────────────────────────
    compatibility_map = {
        "Similarity": ["yelp.csv", "pubmedqa.csv"],
        "MaskedTokenInference": ["wikitext.csv", "tab.csv"],
        "AttributeInference": ["yelp.csv", "reddit.csv"],
        "Coherence": ["imdb.csv", "wikitext.csv"],
        "LengthRobustness": ["yelp.csv"],
        "LengthVariation": ["yelp.csv", "wikitext.csv"],
        "Mauve": ["yelp.csv", "wikitext.csv"],
        "NearestNeighbor": ["yelp.csv", "wikitext.csv"],
        "NERpriv": ["wikitext.csv", "tab.csv"],
        "UtilityPreservation": ["imdb.csv", "pubmedqa.csv"],
    }

    modules = {}

    # Create and install modules one-by-one with retries
    for name, file_name, reqs_file, title, description, use_gpu in module_defs:
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
                use_gpu=use_gpu,
            )
            db.session.add(module_record)
            db.session.commit()
        else:
            module_record.requirements_path = requirements_path
            db.session.commit()

        modules[name] = module_record

        # Skip rebuild if Docker image already exists
        image_tag = module_image_tag(name)
        try:
            docker_client = docker.from_env()
            docker_client.images.get(image_tag)
            logger.info(
                f"Docker image '{image_tag}' already exists. Skipping build for {name}."
            )
            module_record.is_installed = True
            db.session.commit()
            continue
        except docker.errors.ImageNotFound:
            logger.info(f"Docker image '{image_tag}' not found. Will build {name}.")
        except Exception as e:
            logger.warning(
                f"Could not check Docker image for {name}: {e}. Will attempt build."
            )

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
                    use_gpu=use_gpu,
                )

                result = task.get(timeout=600)
                if result.get("status") == "success":
                    logger.info(f"Successfully installed {name}")
                    success = True
                else:
                    logger.error(
                        f"Installation failed for {name}: {result.get('message')}"
                    )
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

    # Populate compatibility junction table (clear existing rows first to allow re-runs)
    for module_name, dataset_names in compatibility_map.items():
        if module_name not in modules:
            continue
        module = modules[module_name]
        db.session.execute(
            module_dataset_compatibility.delete().where(
                module_dataset_compatibility.c.module_id == module.id
            )
        )
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

    logger.info("Checking for system version history record...")
    
    v1_record = AppVersion.query.filter_by(version="1.0.0").first()
    
    if not v1_record:
        logger.info("No system version history found. Compiling v1.0.0 initial snapshot blueprint...")
        
        all_active_modules = BenchmarkModule.query.filter_by(is_active=True).all()
        
        blueprint_snapshot = []
        for m in all_active_modules:
            blueprint_snapshot.append({
                "module_id": m.id,
                "name": m.name,
                "title": m.title,
                "path": m.path,
                "sample_count": getattr(m, 'sample_count', 100),
                "device_specification": getattr(m, 'device_specification', 'cpu'),
                "compatible_datasets": [d.name for d in m.compatible_datasets]
            })
            
        v1_record = AppVersion(
            version="1.0.0",
            description="PrivBench Genesis: Initial platform deployment containing baseline evaluation modules.",
            blueprint=blueprint_snapshot,
            created_at=datetime.utcnow()
        )
        db.session.add(v1_record)
        db.session.flush()
        
        for m in all_active_modules:
            db.session.add(
                ModuleUpdate(
                    module_id=m.id,
                    update_type="new_module",
                    change_level="major",
                    description=f"Initial integration of baseline evaluation module: {m.title}",
                    is_updated=False,
                    version_id=v1_record.id,
                    created_at=datetime.utcnow()
                )
            )
        
        logger.info("Successfully saved system checkpoint state at v1.0.0.")
    else:
        logger.info("AppVersion v1.0.0 already exists. Skipping seeding.")

    db.session.commit()

    logger.info("All datasets and modules have been added to the database.")
    logger.info("All modules have been installed successfully. Docker images are ready.")
