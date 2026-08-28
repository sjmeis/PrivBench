# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from flask import Blueprint, request, jsonify, current_app
from flask import send_from_directory, send_file
import os
import io
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import PrivatizedDataset, Submission, Dataset, BenchmarkModule, ModuleDatasetChoice
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
import logging
import csv
import zipfile
from io import BytesIO
from urllib.parse import unquote
import json


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
PRIVATIZED_DATASETS_FOLDER = os.path.join(PROJECT_ROOT, "data", "privatized_datasets")

def is_safe_path(base_dir: str, path: str) -> bool:
    matchpath = os.path.abspath(path)
    return base_dir == os.path.commonpath((base_dir, matchpath))

logger.info(f"Dataset folder path: {DATASET_FOLDER}")

data_bp = Blueprint("data", __name__)


@data_bp.route("/load-dataset", methods=["POST"])
@jwt_required()
def load_dataset():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

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
@jwt_required()
def get_dataset(filename):
    try:
        sanitized_filename = secure_filename(unquote(filename))
        file_path = os.path.join(DATASET_FOLDER, sanitized_filename)

        if not is_safe_path(DATASET_FOLDER, file_path) or not os.path.isfile(file_path):
            return jsonify({"error": "Dataset not found"}), 404

        return send_from_directory(
            DATASET_FOLDER, sanitized_filename, as_attachment=True, conditional=False
        )

    except Exception as e:
        logger.error(f"Error fetching dataset {filename}: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Ensure the privatized datasets directory exists
os.makedirs(PRIVATIZED_DATASETS_FOLDER, exist_ok=True)


@data_bp.route("/upload-privatized-dataset", methods=["POST"])
@jwt_required()
def upload_privatized_dataset():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        submission_id = request.form.get("submission_id")
        original_dataset_id = request.form.get("original_dataset_id")

        if not all([file, submission_id, original_dataset_id]):
            return jsonify({"error": "Missing required fields"}), 400

        # Verify the submission belongs to the current user
        user_id = get_jwt_identity()
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if not file.filename.endswith(".csv"):
            return (
                jsonify({"error": "Invalid file type. Only CSV files are allowed"}),
                400,
            )

        # Validate dimensions against original dataset
        original_dataset = Dataset.query.get(original_dataset_id)
        if not original_dataset or not os.path.isfile(original_dataset.file_path):
            return jsonify({"error": "Original dataset not found"}), 404

        # Read original dataset header and row count, fetch IDs
        orig_ids = []
        orig_header = None
        with open(original_dataset.file_path, "r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            orig_header = next(reader, None)

            if not orig_header or "id" not in [col.lower() for col in orig_header]:
                return jsonify({"error": "Internal Error: Original dataset missing 'id' column"}), 500
            
            id_index = [col.lower() for col in orig_header].index("id")
            for row in reader:
                if row:
                    orig_ids.append(row[id_index])

        orig_row_count = len(orig_ids) + 1 # +1 for header

        raw_bytes = file.stream.read()
        
        # Check for binary null bytes (prevents compiled binaries/executables disguised as csv)
        if b"\x00" in raw_bytes[:1024]:
            return jsonify({"error": "Invalid file format: Binary files are not permitted."}), 400

        # Check for malicious HTML/JS payloads
        start_snippet = raw_bytes[:512].lower()
        if b"<html" in start_snippet or b"<script" in start_snippet or b"<!doctype" in start_snippet:
            return jsonify({"error": "Invalid file format: HTML/Script content detected."}), 400

        # Stream-parse uploaded CSV in memory without redundant large string copies
        stream = io.StringIO(file.stream.read().decode("utf-8", errors="replace"), newline=None)
        csv_reader = csv.reader(stream)
        
        uploaded_header = next(csv_reader, None)
        if not uploaded_header:
            return jsonify({"error": "Uploaded file is empty"}), 400

        # Validate column names match
        if uploaded_header != orig_header:
            return jsonify({
                "error": f"Column mismatch: expected {orig_header}, got {uploaded_header}"
            }), 400

        uploaded_ids = []
        for row_idx, row in enumerate(csv_reader, start=2):
            if not row:
                continue
            if len(row) <= id_index:
                return jsonify({"error": f"Malformed row at line {row_idx}"}), 400
            uploaded_ids.append(row[id_index])

        uploaded_row_count = len(uploaded_ids) + 1

        # Validate row count matches
        if uploaded_row_count != orig_row_count:
            return jsonify({
                "error": f"Row count mismatch: expected {orig_row_count}, got {uploaded_row_count}"
            }), 400

        # Validate IDs and their order against the original
        if uploaded_ids != orig_ids:
            mismatch_idx = next((i for i, (a, b) in enumerate(zip(uploaded_ids, orig_ids)) if a != b), 0)
            return jsonify({
                "error": f"ID sequence mismatch starting at row {mismatch_idx + 2}. "
                         f"Expected ID '{orig_ids[mismatch_idx]}', got '{uploaded_ids[mismatch_idx]}'. "
                         "Datasets must maintain the exact original row order."
            }), 400

        filename = secure_filename(
            f"{submission_id}_{original_dataset_id}_{file.filename}"
        )
        file_path = os.path.join(PRIVATIZED_DATASETS_FOLDER, filename)

        # Write the already-read content to disk
        if not is_safe_path(PRIVATIZED_DATASETS_FOLDER, file_path):
            return jsonify({"error": "Invalid storage path"}), 400

        stream.seek(0)
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            f.write(stream.read())

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
        datasets = Dataset.query.filter_by(is_deleted=False).all()

        dataset_list = [
            {
                "id": dataset.id,
                "name": dataset.name,
                "filePath": dataset.file_path,
                "createdAt": (
                    dataset.created_at.isoformat() if dataset.created_at else None
                ),
                "isActive": dataset.is_active,
                "compatibleModules": [{"id": m.id, "name": m.name} for m in dataset.compatible_modules]
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
            for ds in module.compatible_datasets:
                if ds.id not in seen_dataset_ids:
                    required_datasets.append(
                        {"id": ds.id, "name": ds.name, "moduleName": module.name}
                    )
                    seen_dataset_ids.add(ds.id)

        return jsonify({"datasets": required_datasets}), 200

    except Exception as e:
        logger.error(f"Error fetching required datasets: {str(e)}")
        return jsonify({"error": str(e)}), 500


@data_bp.route("/submissions/<int:submission_id>/dataset-choices", methods=["POST"])
@jwt_required()
def save_dataset_choices(submission_id):
    """Save per-module dataset choices for a submission.

    Expected JSON body:
        { "choices": [ { "moduleId": 1, "datasetId": 2 }, ... ] }
    """
    try:
        user_id = get_jwt_identity()
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        data = request.get_json() or {}
        choices = data.get("choices", [])
        if not choices:
            return jsonify({"error": "No choices provided"}), 400

        # Validate choices before modifying the database
        validation_errors = []
        valid_choices = []

        for index, choice in enumerate(choices):
            module_id = choice.get("moduleId")
            dataset_id = choice.get("datasetId")

            if not module_id or not dataset_id:
                validation_errors.append({
                    "index": index,
                    "error": "Both moduleId and datasetId are required.",
                })
                continue

            module = BenchmarkModule.query.get(module_id)
            if not module:
                validation_errors.append({
                    "index": index,
                    "moduleId": module_id,
                    "error": "Module not found.",
                })
                continue

            dataset = Dataset.query.get(dataset_id)
            if not dataset:
                validation_errors.append({
                    "index": index,
                    "datasetId": dataset_id,
                    "error": "Dataset not found.",
                })
                continue

            if dataset not in module.compatible_datasets:
                validation_errors.append({
                    "index": index,
                    "moduleId": module_id,
                    "datasetId": dataset_id,
                    "error": "Dataset is not compatible with the specified module.",
                })
                continue

            valid_choices.append((module_id, dataset_id))

        if validation_errors:
            return jsonify({
                "error": "One or more choices are invalid.",
                "details": validation_errors,
            }), 400

        # Delete existing choices now that validation has passed
        ModuleDatasetChoice.query.filter_by(submission_id=submission_id).delete()

        for module_id, dataset_id in valid_choices:
            db.session.add(ModuleDatasetChoice(
                submission_id=submission_id,
                module_id=module_id,
                dataset_id=dataset_id,
            ))

        db.session.commit()
        return jsonify({"message": "Dataset choices saved"}), 200

    except Exception as e:
        logger.error(f"Error saving dataset choices: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@data_bp.route("/submissions/<int:submission_id>/dataset-choices", methods=["GET"])
@jwt_required()
def get_dataset_choices(submission_id):
    """Get per-module dataset choices for a submission."""
    try:
        user_id = get_jwt_identity()
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        if not submission:
            return jsonify({"error": "Submission not found"}), 404

        choices = ModuleDatasetChoice.query.filter_by(submission_id=submission_id).all()

        return jsonify([
            {
                "moduleId": c.module_id,
                "datasetId": c.dataset_id,
                "moduleName": c.module.name if c.module else None,
                "datasetName": c.dataset.name if c.dataset else None,
            }
            for c in choices
        ]), 200

    except Exception as e:
        logger.error(f"Error fetching dataset choices: {str(e)}")
        return jsonify({"error": str(e)}), 500

@data_bp.route('/datasets/upload', methods=['POST'])
@jwt_required()
def upload_dataset():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    dataset_name = request.form.get('name')

    module_ids_raw = request.form.get('moduleIds', '[]')
    module_ids = json.loads(module_ids_raw)
    
    if file.filename == '' or not dataset_name:
        return jsonify({"error": "Missing file or dataset name"}), 400

    filename = secure_filename(f"{dataset_name}.csv")
    file_path = os.path.join(DATASET_FOLDER, filename)

    try:
        file.save(file_path)

        # 2. Update Database
        new_dataset = Dataset(
            name=dataset_name,
            file_path=file_path,
            is_active=True 
        )

        if module_ids:
            modules = BenchmarkModule.query.filter(BenchmarkModule.id.in_(module_ids)).all()
            new_dataset.compatible_modules.extend(modules)
        
        db.session.add(new_dataset)
        db.session.commit()

        return jsonify({
            "id": new_dataset.id,
            "name": new_dataset.name,
            "message": "Dataset uploaded successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@data_bp.route('/datasets/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_dataset(id):
    if not get_jwt().get("is_admin"):
        return jsonify({"message": "Forbidden"}), 403
        
    dataset = Dataset.query.get_or_404(id)
    
    if dataset.submissions:
        return jsonify({"error": "Cannot archive dataset. Active submissions depend on it."}), 400
        
    dataset.is_active = False
    dataset.is_deleted = True  # Add this column to your Dataset DB Model
    db.session.commit()
    
    return jsonify({"message": "Dataset archived successfully"}), 200
