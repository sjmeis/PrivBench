import os
import logging
import json
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import exists
from ..models import (
    BenchmarkModule,
    Dataset,
    BenchmarkScore,
    AppVersion,
    ModuleUpdate,
    SubmissionVersionScore,
    User,
    Submission,
    BenchmarkQueue,
)
from werkzeug.utils import secure_filename
from ..extensions import db
from datetime import datetime
from ..enums import SubmissionStatus
from ..tasks.submission_outdated import mark_submissions_outdated_and_notify
from ..tasks.add_module import install_and_load_module
from ..utils.container_manager import container_manager
from ..utils.version_utils import is_version_greater, recommend_next_version

logger = logging.getLogger(__name__)

# Dataset and modules folder location
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data", "datasets")
MODULES_FOLDER = os.path.join(PROJECT_ROOT, "modules")

module_bp = Blueprint("benchmark_module", __name__)


def _recalculate_version_scores_after_module_delete(module_id: int):
    """
    Remove the deleted module from each SubmissionVersionScore.modules list and
    recompute the version score using remaining module scores for that submission.
    If no modules remain for a version, delete that version row.
    """
    try:
        with db.session.no_autoflush:
            affected_versions = (
                db.session.query(SubmissionVersionScore)
                .filter(
                    SubmissionVersionScore.modules.any(BenchmarkModule.id == module_id)
                )
                .all()
            )

            for vs in affected_versions:
                # Keep only remaining modules
                vs.modules = [m for m in vs.modules if m.id != module_id]

                # If no modules left for this version, remove the record entirely
                if not vs.modules:
                    db.session.delete(vs)
                    continue

                remaining_ids = [m.id for m in vs.modules]
                scores = (
                    db.session.query(BenchmarkScore.score)
                    .filter(
                        BenchmarkScore.submission_id == vs.submission_id,
                        BenchmarkScore.module_id.in_(remaining_ids),
                    )
                    .all()
                )
                score_vals = [row[0] for row in scores]

                # Recompute using available scores. If none found, remove the row.
                if score_vals:
                    vs.score = round(sum(score_vals) / len(score_vals), 2)
                else:
                    db.session.delete(vs)
    except Exception as e:
        logger.error(f"Error recalculating version scores after module delete: {e}")
        raise


def _find_existing_requirements_path(module: BenchmarkModule):
    try:
        safe_module_name = secure_filename(module.name)
        module_dir = os.path.dirname(module.path) if module.path else MODULES_FOLDER

        candidate_paths = [
            os.path.join(MODULES_FOLDER, f"{safe_module_name}_requirements.txt"),
            os.path.join(MODULES_FOLDER, f"{safe_module_name}.txt"),
            os.path.join(module_dir, "requirements.txt"),
        ]

        for candidate_path in candidate_paths:
            if candidate_path and os.path.isfile(candidate_path):
                return candidate_path

        # Fallback: any .txt containing module name in modules folder
        for entry_name in os.listdir(MODULES_FOLDER):
            is_text_file = entry_name.lower().endswith(".txt")
            name_matches = safe_module_name.lower() in entry_name.lower()
            if is_text_file and name_matches:
                fallback_path = os.path.join(MODULES_FOLDER, entry_name)
                if os.path.isfile(fallback_path):
                    return fallback_path
    except Exception:
        pass

    return None


def _stable_requirements_path(module: BenchmarkModule) -> str:
    os.makedirs(MODULES_FOLDER, exist_ok=True)
    safe_module_name = secure_filename(module.name)
    return os.path.join(MODULES_FOLDER, f"{safe_module_name}_requirements.txt")


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


@module_bp.route("/modules/updates/pending", methods=["GET"])
@jwt_required()
def list_pending_module_updates():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.admin:
            return jsonify({"message": "Forbidden"}), 403

        pending = (
            db.session.query(ModuleUpdate)
            .filter(ModuleUpdate.is_updated == True, ModuleUpdate.version_id == None)
            .order_by(ModuleUpdate.created_at.asc())
            .all()
        )
        current_version = AppVersion.get_current_version()

        # Check if any pending update is major
        has_major = any(update.change_level == "major" for update in pending)
        recommended_next = recommend_next_version(current_version, has_major)

        return (
            jsonify(
                {
                    "currentVersion": current_version,
                    "recommendedNext": recommended_next,
                    "hasMajorChanges": has_major,
                    "pending": [update.to_dict() for update in pending],
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error listing pending updates: {e}")
        return jsonify({"message": str(e)}), 500


@module_bp.route("/modules/publish", methods=["POST"])
@jwt_required()
def publish_module_updates():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.admin:
            return jsonify({"message": "Forbidden"}), 403

        data = request.get_json() or {}
        version_str = data.get("version")  # required on publish
        description = data.get("description")
        send_email = data.get("sendEmail", True)

        if (
            not version_str
            or not isinstance(version_str, str)
            or not version_str.strip()
        ):
            return jsonify({"message": "Version is required to publish"}), 400

        current_version = AppVersion.get_current_version()
        if not is_version_greater(version_str, current_version):
            return (
                jsonify(
                    {
                        "message": f"Version must be greater than current ({current_version})"
                    }
                ),
                400,
            )

        # ensure version uniqueness
        exists_version = db.session.query(
            exists().where(AppVersion.version == version_str)
        ).scalar()
        if exists_version:
            return jsonify({"message": f"Version {version_str} already exists"}), 409

        # get pending updates
        pending = (
            db.session.query(ModuleUpdate)
            .filter(ModuleUpdate.is_updated == True, ModuleUpdate.version_id == None)
            .all()
        )
        if not pending:
            return jsonify({"message": "No pending module updates to publish"}), 400

        # create new AppVersion
        new_version = AppVersion(version=version_str)
        db.session.add(new_version)
        db.session.flush()

        # apply version to updated/added modules and finalize ModuleUpdate rows
        affected_module_ids = {u.module_id for u in pending}
        modules = (
            db.session.query(BenchmarkModule)
            .filter(BenchmarkModule.id.in_(affected_module_ids))
            .all()
        )
        for module in modules:
            module.version = version_str

        for pending_update in pending:
            pending_update.is_updated = False
            pending_update.version_id = new_version.id
            if (
                description
                and pending_update.update_type == "modified"
                and not pending_update.description
            ):
                pending_update.description = description

        db.session.commit()

        # Build change summary for the email/task
        module_by_id = {m.id: m for m in modules}
        new_modules = [
            {"id": u.module_id, "name": module_by_id[u.module_id].name}
            for u in pending
            if u.update_type == "new_module" and u.module_id in module_by_id
        ]
        modified_modules = [
            {
                "id": u.module_id,
                "name": module_by_id[u.module_id].name,
                "description": (u.description or "").strip(),
            }
            for u in pending
            if u.update_type == "modified" and u.module_id in module_by_id
        ]

        try:
            if send_email:
                notify_task = mark_submissions_outdated_and_notify.delay(
                    version_str,
                    {"new_modules": new_modules, "modified_modules": modified_modules},
                )
                logger.info(f"Outdated-mark notify task queued: {notify_task.id}")
            else:
                logger.info(
                    "Publish completed without sending emails (admin unchecked notification)."
                )
        except Exception as e:
            logger.warning(f"Failed to enqueue notify task: {e}")

        return (
            jsonify(
                {
                    "message": "Published successfully",
                    "version": version_str,
                    "affectedModules": [m.id for m in modules],
                    "pendingUpdatesClosed": len(pending),
                    "requiresSubmissionUpdate": send_email,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error publishing updates: {e}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


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
        provided_version = request.form.get("version")  # may be empty
        device_spec = request.form.get("deviceSpecification")  # optional

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

        # Do not increment app version here, module will receive its version upon publish.
        # Use current app version or provided version as placeholder.
        current_ver = provided_version or AppVersion.get_current_version()

        new_benchmark_module = BenchmarkModule(
            name=name,
            title=name,
            description=description,
            version=current_ver,
            is_active=True,
            path=algo_path,
            dataset_id=dataset_ids[0],  # TODO: add support for multiple datasets
        )

        db.session.add(new_benchmark_module)
        db.session.flush()

        # Record a pending update entry
        db.session.add(
            ModuleUpdate(
                module_id=new_benchmark_module.id,
                update_type="new_module",
                change_level="major",
                description=f"New module '{name}' added",
                is_updated=True,
                version_id=None,
            )
        )

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

        # Record deletion as a pending update before removing the module
        db.session.add(
            ModuleUpdate(
                module_id=module.id,
                update_type="deleted",
                change_level="major",
                description=f"Module '{module.name}' deleted",
                is_updated=True,
                version_id=None,
            )
        )
        db.session.flush()

        # Stop and remove the running Docker container for this module (if any)
        try:
            container = container_manager.get_container(module.name)
            if container:
                container.stop()
                container.remove(force=True)
                container_manager.running_containers.pop(
                    f"module-container-{module.name.lower()}",
                    None,
                )
                logger.info(f"Stopped and removed container for module {module.name}")
        except Exception as e:
            logger.warning(f"Could not stop/remove container for {module.name}: {e}")

        # Clean up any queue entries pointing to this module to avoid NOT NULL violations
        try:
            deleted_rows = (
                db.session.query(BenchmarkQueue)
                .filter(BenchmarkQueue.module_id == module_id)
                .delete(synchronize_session=False)
            )
            if deleted_rows:
                logger.info(
                    f"Deleted {deleted_rows} queue entries for module {module.name}"
                )
        except Exception as e:
            logger.warning(
                f"Failed deleting queue entries for module {module.name}: {e}"
            )

        # Delete ModuleUpdate rows referencing this module (module_id is NOT NULL)
        try:
            updates_deleted = (
                db.session.query(ModuleUpdate)
                .filter(ModuleUpdate.module_id == module_id)
                .delete(synchronize_session=False)
            )
            if updates_deleted:
                logger.info(
                    f"Deleted {updates_deleted} ModuleUpdate rows for module {module.name}"
                )
        except Exception as e:
            logger.warning(f"Failed deleting ModuleUpdate rows for {module.name}: {e}")

        # Update versioned scores that included this module
        _recalculate_version_scores_after_module_delete(module_id)

        # Delete BenchmarkScore entries for this module
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
                overall_score = sum(s.score for s in remaining_scores) / len(
                    remaining_scores
                )
                submission.score = round(overall_score, 2)
            else:
                submission.score = None

        db.session.commit()
        # Delete the module
        db.session.delete(module)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Benchmark module and associated scores deleted successfully",
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

        changed_fields = []
        if new_name:
            module.name = new_name
            changed_fields.append("name")
        if new_description and new_description != module.description:
            module.description = new_description
            changed_fields.append("description")

        db.session.commit()

        if changed_fields:
            db.session.add(
                ModuleUpdate(
                    module_id=module.id,
                    update_type="modified",
                    change_level="minor",
                    description=f"Fields updated: {', '.join(changed_fields)}",
                    is_updated=True,
                    version_id=None,
                )
            )
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


@module_bp.route("/modules/<int:module_id>/logic/download", methods=["GET"])
@jwt_required()
def download_module_logic(module_id):
    try:
        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        if not module.path or not os.path.isfile(module.path):
            return jsonify({"message": "Module logic file not found"}), 404

        return send_file(
            module.path,
            as_attachment=True,
            download_name=os.path.basename(module.path),
        )
    except Exception as e:
        logger.error(f"Error downloading module logic: {e}")
        return jsonify({"message": str(e)}), 500


@module_bp.route("/modules/update/logic/<int:module_id>", methods=["POST"])
@jwt_required()
def update_module_logic(module_id):
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

        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"message": "No file provided"}), 400

        filename = secure_filename(file.filename)
        if not filename.lower().endswith(".py"):
            return jsonify({"message": "Only .py files are accepted"}), 400

        # Use a stable filename and overwrite if it exists
        os.makedirs(MODULES_FOLDER, exist_ok=True)
        stable_name = f"{secure_filename(module.name)}.py"
        save_path = os.path.join(MODULES_FOLDER, stable_name)
        file.save(save_path)

        # Find existing requirements for this module (reuse, do not require re-upload)
        requirements_path = _find_existing_requirements_path(module)

        # Restart container and keep path stable
        try:
            container = container_manager.get_container(module.name)
            if container:
                container.stop()
                container.remove(force=True)
                container_manager.running_containers.pop(
                    f"module-container-{module.name.lower()}",
                    None,
                )
        except Exception as e:
            logger.warning(f"Could not stop/remove container for {module.name}: {e}")

        # Ensure DB path points to the stable file
        if module.path != save_path:
            module.path = save_path
        db.session.commit()

        db.session.add(
            ModuleUpdate(
                module_id=module.id,
                update_type="modified",
                change_level="major",
                description="Logic updated",
                is_updated=True,
                version_id=None,
            )
        )
        db.session.commit()

        # Reinstall/reload in background
        install_task = None
        try:
            install_task = install_and_load_module.delay(
                module_id=module.id,
                module_name=module.name,
                module_path=save_path,
                requirements_path=requirements_path,
                is_new_module=False,
                restart_container=True,
            )
        except Exception as e:
            logger.warning(f"Failed to enqueue reinstall for {module.name}: {e}")

        return (
            jsonify(
                {
                    "message": "Module logic updated",
                    "moduleId": module.id,
                    "path": save_path,
                    "install_task_id": install_task.id if install_task else None,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error updating module logic: {e}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@module_bp.route("/modules/update/dataset/<int:module_id>", methods=["POST"])
@jwt_required()
def update_module_dataset(module_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.admin:
            return jsonify({"message": "Forbidden"}), 403

        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        dataset = module.dataset
        if not dataset:
            return jsonify({"message": "Module dataset not configured"}), 400

        uploaded = request.files.get("file")
        if not uploaded or not uploaded.filename:
            return jsonify({"message": "No file provided"}), 400

        allowed_exts = (".csv", ".parquet", ".json", ".zip", ".txt")
        filename = secure_filename(uploaded.filename)
        if not filename.lower().endswith(allowed_exts):
            return (
                jsonify(
                    {
                        "message": f"Unsupported file type. Allowed: {', '.join(allowed_exts)}"
                    }
                ),
                400,
            )

        # Overwrite in place and update Dataset row
        os.makedirs(DATASET_FOLDER, exist_ok=True)
        new_path = os.path.join(DATASET_FOLDER, filename)
        uploaded.save(new_path)

        dataset.name = filename
        dataset.file_path = new_path

        db.session.add(
            ModuleUpdate(
                module_id=module.id,
                update_type="modified",
                change_level="major",
                description="Dataset updated",
                is_updated=True,
                version_id=None,
            )
        )
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Dataset updated",
                    "moduleId": module.id,
                    "dataset": {
                        "id": dataset.id,
                        "name": dataset.name,
                        "filePath": dataset.file_path,
                        "createdAt": (
                            dataset.created_at.isoformat()
                            if dataset.created_at
                            else None
                        ),
                        "isActive": dataset.is_active,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error updating module dataset: {e}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@module_bp.route("/admin/modules/<int:module_id>/requirements", methods=["POST"])
@jwt_required()
def update_module_requirements(module_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.admin:
            return jsonify({"message": "Forbidden"}), 403

        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        uploaded = request.files.get("file")
        if not uploaded or not uploaded.filename:
            return jsonify({"message": "No file provided"}), 400

        filename = secure_filename(uploaded.filename)
        if not filename.lower().endswith((".txt", ".in")):
            return jsonify({"message": "Only .txt or .in files are accepted"}), 400

        # Save to stable location so future updates can find it
        save_path = _stable_requirements_path(module)
        uploaded.save(save_path)

        db.session.add(
            ModuleUpdate(
                module_id=module.id,
                update_type="modified",
                change_level="major",
                description="Requirements updated",
                is_updated=True,
                version_id=None,
            )
        )
        db.session.commit()

        # Restart container if exists (we'll reinstall requirements)
        try:
            container = container_manager.get_container(module.name)
            if container:
                container.stop()
                container.remove(force=True)
                container_manager.running_containers.pop(
                    f"module-container-{module.name.lower()}",
                    None,
                )
        except Exception as e:
            logger.warning(f"Could not stop/remove container for {module.name}: {e}")

        # Reinstall dependencies and reload module in background
        install_task = None
        try:
            install_task = install_and_load_module.delay(
                module_id=module.id,
                module_name=module.name,
                module_path=module.path,  # keep current logic file
                requirements_path=save_path,
                is_new_module=False,
                restart_container=True,
            )
        except Exception as e:
            logger.warning(f"Failed to enqueue reinstall for {module.name}: {e}")

        return (
            jsonify(
                {
                    "message": "Requirements updated",
                    "moduleId": module.id,
                    "requirementsPath": save_path,
                    "install_task_id": install_task.id if install_task else None,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error updating module requirements: {e}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@module_bp.route(
    "/admin/modules/<int:module_id>/requirements/download", methods=["GET"]
)
@jwt_required()
def download_module_requirements(module_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.admin:
            return jsonify({"message": "Forbidden"}), 403

        module = BenchmarkModule.query.get(module_id)
        if not module:
            return jsonify({"message": "Benchmark module not found"}), 404

        req_path = _find_existing_requirements_path(module)
        if not req_path or not os.path.isfile(req_path):
            return jsonify({"message": "Requirements file not found"}), 404

        return send_file(
            req_path,
            as_attachment=True,
            download_name=os.path.basename(req_path),
        )
    except Exception as e:
        logger.error(f"Error downloading requirements: {e}")
        return jsonify({"message": str(e)}), 500
