from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required
)
from ..models import BenchmarkModule, Dataset
from ..models.user import User
import os
from werkzeug.utils import secure_filename
import logging
import json
from app.tasks.add_module import install_and_load_module
from ..extensions import db
from datetime import datetime

logger = logging.getLogger(__name__)

# Dataset and modules folder location
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data", "datasets")
MODULES_FOLDER = os.path.join(PROJECT_ROOT, "modules")

module_bp = Blueprint('benchmark_module', __name__)


@module_bp.route('/modules', methods=['GET'])
def get_all_benchmark_modules():
    try:
        modules = BenchmarkModule.query.all()

        module_list = []
        for module in modules:
            dataset = module.dataset

            module_info = {
                "id": module.id,
                "name": module.name,
                "title": module.title,
                "version": module.version,
                "isActive": module.is_active,
                "createdAt": module.created_at.isoformat() if module.created_at else None,
                "path": module.path,
                "datasetId": module.dataset_id,
                "description": module.description,
                "dataset": {
                    "id": dataset.id,
                    "name": dataset.name,
                    "filePath": dataset.file_path,
                    "createdAt": dataset.created_at.isoformat() if dataset.created_at else None,
                    "isActive": dataset.is_active
                } if dataset else None
            }

            module_list.append(module_info)

        return jsonify(module_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch benchmark modules", "details": str(e)}), 500


@module_bp.route('/modules/create', methods=['POST'])
@jwt_required()
def create_benchmark_module():
    try:
        # Authentication check
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"message": "User not found"}), 404
        if not user.admin:
            return jsonify({"message": "User doesn't possess the necessary permissions."}), 403

        # Handle text fields
        name = request.form.get('name')
        description = request.form.get('description')
        
        # Handle selected datasets - comes as JSON string
        selected_datasets_json = request.form.get('selectedDatasets')
        selected_datasets = json.loads(selected_datasets_json) if selected_datasets_json else []

        dataset_ids = [dataset.get('id') for dataset in selected_datasets]

        if not all([name, description]):
            logger.error("Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400

        # Handle algorithm file
        algorithm_file = request.files.get('algorithmFile')
        if algorithm_file:
            algo_filename = secure_filename(algorithm_file.filename)
            algo_path = os.path.join(MODULES_FOLDER, algo_filename)
            algorithm_file.save(algo_path)
        else:
            logger.error("Invalid or missing algorithm file")
            return jsonify({"error": "Invalid or missing algorithm file"}), 400

        # Handle requirements file
        requirements_path = None
        requirements_file = request.files.get('requirementsFile')
        if requirements_file:
            req_filename = secure_filename(requirements_file.filename)
            if not req_filename.endswith('.txt'):
                return jsonify({"error": "Requirements file must be a .txt file"}), 400
            requirements_path = os.path.join(MODULES_FOLDER, req_filename)
            requirements_file.save(requirements_path)

            # TODO: handle requirements file

            # Optional: Validate requirements file content
            try:
                with open(requirements_path, 'r') as f:
                    requirements_content = f.read()
                if not requirements_content.strip():
                    logger.warning("Empty requirements file uploaded")
            except Exception as e:
                logger.error(f"Error reading requirements file: {str(e)}")
                return jsonify({"error": "Invalid requirements file"}), 400

        # Handle uploaded datasets
        uploaded_files = request.files.getlist('uploadedDatasets')
        uploaded_file_paths = []
        
        if uploaded_files:
            for file in uploaded_files:
                if file and file.filename:
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(DATASET_FOLDER, filename)
                    file.save(file_path)
                    uploaded_file_paths.append(file_path)
                    # Create a new Dataset entry
                    new_dataset = Dataset(
                        name=filename,
                        file_path=file_path,
                        created_at=datetime.utcnow(),
                        is_active=True
                    )

                    # Add and commit the new entry to the database
                    db.session.add(new_dataset)
                    db.session.flush()

                    dataset_ids.append(new_dataset.id)
                else:
                    logger.warning(f"Skipping invalid dataset file")
                    continue

        new_benchmark_module = BenchmarkModule(
            name=name,
            title=name,
            description=description,
            version="1.0.0",
            is_active=True,
            path=algo_path,
            dataset_id=dataset_ids[0] #TODO: add support for multiple datasets
        )

        db.session.add(new_benchmark_module)
        db.session.flush()
        db.session.commit()

        # Debugging: Print received data
        logger.debug("Name: %s", name)
        logger.debug("Description: %s", description)
        logger.debug("Selected Datasets: %s", selected_datasets)
        logger.debug("Algorithm File Path: %s", algo_path)
        logger.debug("Requirements File Path: %s", requirements_path)
        logger.debug("Uploaded Dataset File Paths: %s", uploaded_file_paths)


        # After saving files, start async task
        task = install_and_load_module.delay(
            module_id=new_benchmark_module.id,
            module_name=name,
            module_path=algo_path,
            requirements_path=requirements_path if requirements_path else None
        )


        return jsonify({
            "message": "Benchmark module created successfully",
            "data": {
                "name": name,
                "description": description,
                "selectedDatasets": selected_datasets,
                "algorithmFilePath": algo_path,
                "requirementsFilePath": requirements_path,
                "uploadedDatasetPaths": uploaded_file_paths,
            }
        }), 201

    except json.JSONDecodeError as e:
        logger.error(f"Error decoding selected datasets JSON: {str(e)}")
        return jsonify({
            "error": "Invalid format for selected datasets",
            "details": str(e)
        }), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            "error": "An error occurred while processing the request",
            "details": str(e)
        }), 500
    

@module_bp.route('/modules/<task_id>/status', methods=['GET'])
@jwt_required()
def get_module_status(task_id):
    task = install_and_load_module.AsyncResult(task_id)
    if task.ready():
        result = task.get()
        return jsonify(result)
    return jsonify({
        "status": "pending",
        "message": "Installation in progress"
    })
