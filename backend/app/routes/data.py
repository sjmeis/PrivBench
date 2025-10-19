from flask import Blueprint, request, jsonify, current_app
from flask import send_from_directory, send_file
import os
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import PrivatizedDataset, Submission, Dataset, BenchmarkModule
from datetime import datetime
import logging
import zipfile
from io import BytesIO
from urllib.parse import unquote


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
PRIVATIZED_DATASETS_FOLDER = os.path.join(PROJECT_ROOT, "data", "privatized_datasets")

logger.info(f"Dataset folder path: {DATASET_FOLDER}")

data_bp = Blueprint("data", __name__)


@data_bp.route("/load-dataset", methods=["POST"])
def load_dataset():
    try:
        # Ensure the dataset folder exists
        if not os.path.exists(DATASET_FOLDER):
            os.makedirs(DATASET_FOLDER)

        dataset_name = request.form.get("name")
        dataset_file = request.files.get("file")

        if not dataset_name or not dataset_file:
            return jsonify({"error": "Dataset name and file are required"}), 400

        # Secure the filename and construct the full path
        filename = secure_filename(dataset_file.filename)
        file_path = os.path.join(DATASET_FOLDER, filename)

        dataset_file.save(file_path)

        logger.info("=== Debug Information ===")
        logger.info(f"File saved at: {file_path}")
        logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
        logger.info(f"File exists: {os.path.exists(file_path)}")

        # List contents of DATASET_FOLDER
        logger.info("Contents of DATASET_FOLDER:")
        if os.path.exists(DATASET_FOLDER):
            logger.info(os.listdir(DATASET_FOLDER))
        else:
            logger.info("DATASET_FOLDER does not exist!")

        # Check if the file exists after saving
        if not os.path.exists(file_path):
            logger.error(f"File not saved correctly: {file_path}")
            return jsonify({"error": "Failed to save file"}), 500

        new_dataset = Dataset(
            name=dataset_name,
            file_path=file_path,
            created_at=datetime.utcnow(),
            is_active=True,
        )

        # Add and commit the new entry to the database
        db.session.add(new_dataset)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Dataset entry created successfully",
                    "dataset_id": new_dataset.id,
                }
            ),
            201,
        )

    except Exception as e:
        # Handle any errors
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500


@data_bp.route("/datasets/list", methods=["GET"])
def get_dataset_list():
    try:
        files = [
            f
            for f in os.listdir(DATASET_FOLDER)
            if os.path.isfile(os.path.join(DATASET_FOLDER, f))
            and f.lower().endswith(".csv")
            and not f.lower().startswith(
                "test"
            )  # Only include files starting with "test"
        ]
        if not files:
            return jsonify({"error": "No files found in the dataset folder"}), 404

        datasets = []
        for idx, filename in enumerate(files, start=1):
            datasets.append({"id": idx, "name": filename})

        return jsonify({"datasets": datasets}), 200

    except Exception as e:
        logger.error(f"Error fetching datasets: {str(e)}")
        return jsonify({"error": str(e)}), 500


@data_bp.route("/datasets/<path:filename>", methods=["GET"])
def get_dataset(filename):
    try:
        filename = unquote(filename)
        file_path = os.path.join(DATASET_FOLDER, filename)
        if not os.path.isfile(file_path):
            return jsonify({"error": "Dataset not found"}), 404

        return send_from_directory(
            DATASET_FOLDER, filename, as_attachment=True, conditional=False
        )

    except Exception as e:
        logger.error(f"Error fetching dataset {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Ensure the privatized datasets directory exists
os.makedirs(PRIVATIZED_DATASETS_FOLDER, exist_ok=True)


@data_bp.route("/upload-privatized-dataset", methods=["POST"])
def upload_privatized_dataset():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        submission_id = request.form.get("submission_id")
        original_dataset_id = request.form.get("original_dataset_id")

        if not all([file, submission_id, original_dataset_id]):
            return jsonify({"error": "Missing required fields"}), 400

        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if not file.filename.endswith(".csv"):
            return (
                jsonify({"error": "Invalid file type. Only CSV files are allowed"}),
                400,
            )

        filename = secure_filename(
            f"{submission_id}_{original_dataset_id}_{file.filename}"
        )
        file_path = os.path.join(PRIVATIZED_DATASETS_FOLDER, filename)

        file.save(file_path)

        privatized_dataset = PrivatizedDataset(
            submission_id=submission_id,
            original_dataset_id=original_dataset_id,
            file_path=file_path,
            created_at=datetime.utcnow(),
            processing_status="pending",
        )

        db.session.add(privatized_dataset)
        db.session.commit()

        logger.info(f"Successfully uploaded privatized dataset: {filename}")

        return (
            jsonify(
                {
                    "message": "File uploaded successfully",
                    "privatized_dataset_id": privatized_dataset.id,
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error uploading privatized dataset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@data_bp.route("/submission-datasets/<int:submission_id>", methods=["GET"])
def get_submission_datasets(submission_id):
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        datasets = [
            {
                "id": dataset.id,
                "name": dataset.name,
                "has_privatized": any(
                    pd.original_dataset_id == dataset.id
                    for pd in submission.privatized_datasets
                ),
            }
            for dataset in submission.datasets
        ]

        return jsonify(datasets), 200

    except Exception as e:
        logger.error(f"Error fetching submission datasets: {str(e)}")
        return jsonify({"error": str(e)}), 500


@data_bp.route("/datasets", methods=["GET"])
def get_all_datasets():
    try:
        datasets = Dataset.query.all()

        dataset_list = [
            {
                "id": dataset.id,
                "name": dataset.name,
                "filePath": dataset.file_path,
                "createdAt": (
                    dataset.created_at.isoformat() if dataset.created_at else None
                ),
                "isActive": dataset.is_active,
            }
            for dataset in datasets
        ]

        return jsonify(dataset_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch datasets", "details": str(e)}), 500


@data_bp.route("/update/datasets/list/<int:submission_id>", methods=["GET"])
def get_required_datasets(submission_id):
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        active_modules = BenchmarkModule.query.filter_by(is_active=True).all()

        completed_module_ids = {
            score.module_id for score in submission.benchmark_scores
        }

        incomplete_modules = [
            module for module in active_modules if module.id not in completed_module_ids
        ]

        required_datasets = []
        seen_dataset_ids = set()

        for module in incomplete_modules:
            if module.dataset_id not in seen_dataset_ids:
                dataset = module.dataset
                required_datasets.append(
                    {"id": dataset.id, "name": dataset.name, "moduleName": module.name}
                )
                seen_dataset_ids.add(dataset.id)

        return jsonify({"datasets": required_datasets}), 200

    except Exception as e:
        logger.error(f"Error fetching required datasets: {str(e)}")
        return jsonify({"error": str(e)}), 500
