from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from ..models import BenchmarkModule, Dataset, BenchmarkScore, AppVersion
from ..models.user import User
import os
from werkzeug.utils import secure_filename
import logging
import json
import threading
from app.tasks.add_module import install_and_load_module
from ..extensions import db
from datetime import datetime
from app.tasks.submission_outdated import mark_submissions_outdated_and_notify
from ..models.submission import Submission
from ..enums import SubmissionStatus

logger = logging.getLogger(__name__)

# Dataset and modules folder location
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data", "datasets")
MODULES_FOLDER = os.path.join(PROJECT_ROOT, "modules")

module_bp = Blueprint("benchmark_module", __name__)


@module_bp.route("/modules", methods=["GET"])
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
                "createdAt": (
                    module.created_at.isoformat() if module.created_at else None
                ),
                "path": module.path,
                "datasetId": module.dataset_id,
                "description": module.description,
                "dataset": (
                    {
                        "id": dataset.id,
                        "name": dataset.name,
                        "filePath": dataset.file_path,
                        "createdAt": (
                            dataset.created_at.isoformat()
                            if dataset.created_at
                            else None
                        ),
                        "isActive": dataset.is_active,
                    }
                    if dataset
                    else None
                ),
            }

            module_list.append(module_info)

        return jsonify(module_list), 200
    except Exception as e:
        return (
            jsonify({"error": "Failed to fetch benchmark modules", "details": str(e)}),
            500,
        )


@module_bp.route("/modules/create", methods=["POST"])
@jwt_required()
def create_benchmark_module():
    try:

        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"message": "User not found"}), 404
        if not user.admin:
            return (
                jsonify({"message": "User doesn't possess the necessary permissions."}),
                403,
            )

        name = request.form.get("name")
        description = request.form.get("description")

        # Handle selected datasets - comes as JSON string
        selected_datasets_json = request.form.get("selectedDatasets")
        selected_datasets = (
            json.loads(selected_datasets_json) if selected_datasets_json else []
        )

        dataset_ids = [dataset.get("id") for dataset in selected_datasets]

        if not all([name, description]):
            logger.error("Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400

        # Handle algorithm file
        algorithm_file = request.files.get("algorithmFile")
        if algorithm_file:
            algo_filename = secure_filename(algorithm_file.filename)
            algo_path = os.path.join(MODULES_FOLDER, algo_filename)
            algorithm_file.save(algo_path)
        else:
            logger.error("Invalid or missing algorithm file")
            return jsonify({"error": "Invalid or missing algorithm file"}), 400

        # Handle requirements file
        requirements_path = None
        requirements_file = request.files.get("requirementsFile")
        if requirements_file:
            req_filename = secure_filename(requirements_file.filename)
            if not req_filename.endswith(".txt"):
                return jsonify({"error": "Requirements file must be a .txt file"}), 400
            requirements_path = os.path.join(MODULES_FOLDER, req_filename)
            requirements_file.save(requirements_path)

            try:
                with open(requirements_path, "r") as f:
                    requirements_content = f.read()
                if not requirements_content.strip():
                    logger.warning("Empty requirements file uploaded")
            except Exception as e:
                logger.error(f"Error reading requirements file: {str(e)}")
                return jsonify({"error": "Invalid requirements file"}), 400

        # Handle uploaded datasets
        uploaded_files = request.files.getlist("uploadedDatasets")
        uploaded_file_paths = []

        if uploaded_files:
            for file in uploaded_files:
                if file and file.filename:
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(DATASET_FOLDER, filename)
                    file.save(file_path)
                    uploaded_file_paths.append(file_path)

                    new_dataset = Dataset(
                        name=filename,
                        file_path=file_path,
                        created_at=datetime.utcnow(),
                        is_active=True,
                    )

                    db.session.add(new_dataset)
                    db.session.flush()

                    dataset_ids.append(new_dataset.id)
                else:
                    logger.warning(f"Skipping invalid dataset file")
                    continue

        # Increment app version
        new_version = AppVersion.increment_version()
        logger.info(f"Incremented app version to {new_version}")

        new_benchmark_module = BenchmarkModule(
            name=name,
            title=name,
            description=description,
            version=new_version,
            is_active=True,
            path=algo_path,
            dataset_id=dataset_ids[0],  # TODO: add support for multiple datasets
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

        logger.info(
            f"Dispatching install_and_load_module task for module ID {new_benchmark_module.id}"
        )
        install_task = install_and_load_module.delay(
            module_id=new_benchmark_module.id,
            module_name=name,
            module_path=algo_path,
            requirements_path=requirements_path if requirements_path else None,
            is_new_module=True,
        )

        notify_task = mark_submissions_outdated_and_notify.delay(name)

        return (
            jsonify(
                {
                    "message": "Benchmark module created successfully",
                    "data": {
                        "name": name,
                        "description": description,
                        "selectedDatasets": selected_datasets,
                        "algorithmFilePath": algo_path,
                        "requirementsFilePath": requirements_path,
                        "uploadedDatasetPaths": uploaded_file_paths,
                        "install_task_id": install_task.id,
                        "notify_task_id": notify_task.id,
                    },
                }
            ),
            201,
        )

    except json.JSONDecodeError as e:
        logger.error(f"Error decoding selected datasets JSON: {str(e)}")
        return (
            jsonify(
                {"error": "Invalid format for selected datasets", "details": str(e)}
            ),
            400,
        )
    except Exception as e:
        logger.error(f"Error creating benchmark module: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@module_bp.route("/modules/<task_id>/status", methods=["GET"])
@jwt_required()
def get_module_status(task_id):
    task = install_and_load_module.AsyncResult(task_id)
    if task.ready():
        result = task.get()
        return jsonify(result)
    return jsonify({"status": "pending", "message": "Installation in progress"})


@module_bp.route("/modules/update/information", methods=["POST"])
@jwt_required()
def get_benchmarking_modules_for_submission():
    try:
        data = request.get_json()
        submission_id = data.get("id")

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = db.session.query(Submission).get(submission_id)
        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        active_modules = (
            db.session.query(BenchmarkModule).filter_by(is_active=True).all()
        )

        scores = (
            db.session.query(BenchmarkScore)
            .filter_by(submission_id=submission_id)
            .all()
        )
        score_map = {score.module_id: score.score for score in scores}

        modules_data = []
        for module in active_modules:
            module_data = {
                "id": module.id,
                "name": module.name,
                "title": module.title,
                "version": module.version,
                "isActive": module.is_active,
                "createdAt": (
                    module.created_at.isoformat() if module.created_at else None
                ),
                "score": score_map.get(module.id),
                "description": module.description,
            }
            modules_data.append(module_data)

        return (
            jsonify({"submissionName": submission.name, "modules": modules_data}),
            200,
        )

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@module_bp.route("/modules/delete/<int:module_id>", methods=["DELETE"])
@jwt_required()
def delete_benchmark_module(module_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"message": "User not found"}), 404
        if not user.admin:
            return (
                jsonify({"message": "User doesn't possess the necessary permissions."}),
                403,
            )

        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        BenchmarkScore.query.filter_by(module_id=module_id).delete()

        # Update overall scores for submissions with status COMPLETED
        completed_submissions = Submission.query.filter_by(
            status=SubmissionStatus.COMPLETED
        ).all()
        for submission in completed_submissions:
            remaining_scores = (
                db.session.query(BenchmarkScore)
                .filter_by(submission_id=submission.id)
                .all()
            )

            if remaining_scores:
                overall_score = sum(score.score for score in remaining_scores) / len(
                    remaining_scores
                )
                submission.score = overall_score
            else:
                submission.score = None

            db.session.commit()

        db.session.delete(module)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Benchmark module and associated scores deleted successfully"
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error deleting benchmark module: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@module_bp.route("/modules/update/<int:module_id>", methods=["PUT"])
@jwt_required()
def update_benchmark_module(module_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"message": "User not found"}), 404
        if not user.admin:
            return (
                jsonify({"message": "User doesn't possess the necessary permissions."}),
                403,
            )

        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        data = request.get_json()
        new_name = data.get("name")
        new_description = data.get("description")

        if new_name:
            module.name = new_name
        if new_description:
            module.description = new_description

        db.session.commit()

        # Return the updated module as JSON
        updated_module = {
            "id": module.id,
            "name": module.name,
            "description": module.description,
            "title": module.title,
            "version": module.version,
            "isActive": module.is_active,
            "createdAt": module.created_at.isoformat() if module.created_at else None,
        }

        return jsonify(updated_module), 200

    except Exception as e:
        logger.error(f"Error updating benchmark module: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
