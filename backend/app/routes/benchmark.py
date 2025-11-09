from flask import Blueprint, jsonify, request
from ..services import QueueService, BenchmarkService, run_benchmark_task
from ..extensions import db, celery
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import (
    BenchmarkModule,
    Submission,
    User,
    Dataset,
    PrivatizedDataset,
    BenchmarkScore,
    BenchmarkQueue,
    QueueStatus,
    AppVersion,
    SubmissionVersionScore,
    ModuleUpdate,
)
from ..enums import SubmissionStatus
from datetime import datetime
from ..utils.email_sender import send_email
from ..utils.version_utils import get_significant_version, is_version_greater
from celery.utils.log import get_task_logger
from datetime import datetime
from ..config import Config

logger = get_task_logger(__name__)

benchmark_bp = Blueprint("benchmark", __name__)


def _compute_modules_to_update(submission: Submission):
    """Return list of modules requiring update with reason and dataset requirement."""
    active_modules = BenchmarkModule.query.filter_by(is_active=True).all()

    # Build AppVersion lookup for ModuleUpdate.version_id
    versions_by_id = {
        version.id: version for version in db.session.query(AppVersion).all()
    }

    results = []
    for module in active_modules:
        score = (
            db.session.query(BenchmarkScore)
            .filter_by(submission_id=submission.id, module_id=module.id)
            .first()
        )

        if not score:
            # New module for this submission
            dataset = (
                Dataset.query.get(module.dataset_id) if module.dataset_id else None
            )
            results.append(
                {
                    "module_id": module.id,
                    "module_name": module.name,
                    "reason": "new",
                    "requires_dataset_upload": True,
                    "dataset_id": dataset.id if dataset else None,
                    "dataset_name": dataset.name if dataset else None,
                }
            )
            continue

        # Find published updates for this module after the submission's version
        published_updates = (
            db.session.query(ModuleUpdate)
            .filter(
                ModuleUpdate.module_id == module.id,
                ModuleUpdate.version_id.isnot(None),
            )
            .all()
        )

        # Collect flags, then decide a single reason
        has_dataset_update = False
        has_logic_update = False
        has_requirements_update = False
        has_other_major_modified = False

        for update in published_updates:
            app_version = versions_by_id.get(update.version_id)
            if not app_version:
                continue
            # Only consider updates published after the user's submission version
            if submission.version and not is_version_greater(
                app_version.version, submission.version
            ):
                continue

            desc = (update.description or "").lower()
            if "dataset updated" in desc:
                has_dataset_update = True
            if "requirements updated" in desc:
                has_requirements_update = True
            if "logic updated" in desc:
                has_logic_update = True
            if update.change_level == "major" and update.update_type == "modified":
                has_other_major_modified = True

        # Build reasons array
        reasons = []
        if has_logic_update:
            reasons.append("logic")
        if has_requirements_update:
            reasons.append("requirements")
        if has_dataset_update:
            reasons.append("dataset")
        if has_other_major_modified:
            reasons.append("modified")

        if reasons:
            dataset = (
                Dataset.query.get(module.dataset_id) if module.dataset_id else None
            )
            results.append(
                {
                    "module_id": module.id,
                    "module_name": module.name,
                    "reasons": reasons,
                    "requires_dataset_upload": has_dataset_update,
                    "dataset_id": dataset.id if dataset else None,
                    "dataset_name": dataset.name if dataset else None,
                }
            )

    return results


@benchmark_bp.route("/run-benchmark", methods=["POST"])
@jwt_required()
def benchmark():
    """Endpoint to start benchmark tasks."""
    submission = None
    try:
        # Add CORS headers
        response_headers = {
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            return ("", 204, response_headers)

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        logger.info(f"Starting benchmark for user {user_id}")

        # Print Celery configuration for debugging
        logger.info(f"Celery Config: {celery.conf}")

        # Retrieve latest submission
        submission = (
            db.session.query(Submission)
            .filter_by(user_id=user_id)
            .filter(
                Submission.status.in_(
                    [SubmissionStatus.PENDING, SubmissionStatus.IN_PROGRESS]
                )
            )
            .order_by(Submission.created_at.desc())
            .first()
        )

        # If no PENDING submission, try to find an IN_PROGRESS submission
        if not submission:
            submission = (
                db.session.query(Submission)
                .filter_by(user_id=user_id, status=SubmissionStatus.IN_PROGRESS)
                .first()
            )

        if not submission:
            logger.error("No pending or in-progress submissions found")
            return (
                jsonify({"message": "No pending or in-progress submissions found"}),
                404,
                response_headers,
            )

        # Only update status if it's PENDING
        if submission.status == SubmissionStatus.PENDING:
            submission.status = SubmissionStatus.IN_PROGRESS
            # Get current version and ensure it's a significant version (x.y.0)
            current_version = AppVersion.get_current_version()
            submission.version = get_significant_version(current_version)
            db.session.commit()
            logger.info(f"Updated submission {submission.id} status to IN_PROGRESS")
        else:
            logger.info(f"Submission {submission.id} already in progress")

        # Instead of starting tasks immediately, add to queue for each module
        queue_entries = []
        immediate_tasks = []
        benchmark_modules = (
            db.session.query(BenchmarkModule).filter_by(is_active=True).all()
        )

        for module in benchmark_modules:
            logger.info(f"Processing module: {module.name}")
            dataset = db.session.query(Dataset).filter_by(id=module.dataset_id).first()
            if not dataset:
                logger.error(f"Dataset not found for module {module.name}")
                continue

            privatized_dataset = (
                db.session.query(PrivatizedDataset)
                .filter_by(
                    submission_id=submission.id, original_dataset_id=module.dataset_id
                )
                .first()
            )
            if not privatized_dataset:
                logger.error(f"Privatized dataset not found for module {module.name}")
                continue

            # Add submission to queue for this module
            queue_entry = QueueService.add_to_queue(
                submission_id=submission.id, module_id=module.id, user_id=user_id
            )

            if queue_entry:
                # Get current position in queue
                position_info = QueueService.get_queue_position(
                    submission.id, module.id
                )

                queue_entries.append(
                    {
                        "module_id": module.id,
                        "module_name": module.name,
                        "queue_entry_id": queue_entry.id,
                        "position": (
                            position_info["position"] if position_info else None
                        ),
                        "status": (
                            position_info["status"] if position_info else "waiting"
                        ),
                    }
                )

                # Check if this entry should start processing immediately (position 1)
                if position_info and position_info["position"] == 1:
                    logger.info(
                        f"Starting immediate processing for module {module.name} at position 1"
                    )
                    task_result = BenchmarkService.process_module_queue_entry(
                        queue_entry, module, dataset, privatized_dataset
                    )
                    if task_result:
                        immediate_tasks.append(task_result)
                        # Update the queue entry status in our response
                        for queue_item in queue_entries:
                            if queue_item["queue_entry_id"] == queue_entry.id:
                                queue_item["status"] = "processing"
                                break

        if not queue_entries:
            submission.status = SubmissionStatus.FAILED
            db.session.commit()
            logger.error("No benchmark tasks could be started")
            if user and user.mail_address:
                user_email = user.mail_address
                subject = "Benchmark failed"
                frontend_url = Config.FRONTEND_URL
                body = f"""
Dear {user.username},<br><br>

Unfortunately, your latest submission has failed.<br><br>

Best regards,<br>
PrivBench Team
"""

                try:
                    send_email(user_email, subject, body, redirect_url=frontend_url)
                    logger.info(f"Email sent successfully to {user_email}")
                except Exception as e:
                    logger.error(f"Failed to send email to {user_email}: {str(e)}")
            return jsonify({"message": "No modules could be queued"}), 400

        # Prepare response
        response_data = {
            "submission_id": submission.id,
            "queue_entries": queue_entries,
            "immediate_tasks": immediate_tasks,
            "message": f"Added to queue for {len(queue_entries)} modules",
        }

        # If some tasks started immediately, include their task IDs
        if immediate_tasks:
            response_data["task_ids"] = immediate_tasks

        logger.info(
            f"Successfully queued {len(queue_entries)} modules, {len(immediate_tasks)} started immediately"
        )
        return jsonify(response_data), 202, response_headers

    except Exception as e:
        logger.error(f"Error in benchmark endpoint: {str(e)}", exc_info=True)
        db.session.rollback()
        if submission:
            submission.status = SubmissionStatus.FAILED
            db.session.commit()
            if user and user.mail_address:
                user_email = user.mail_address
                subject = "Benchmark failed"
                frontend_url = Config.FRONTEND_URL
                body = f"""
Dear {user.username},<br><br>

Unfortunately, your latest submission has failed.<br><br>

Best regards,<br>
PrivBench Team
"""

                try:
                    send_email(user_email, subject, body, redirect_url=frontend_url)
                    logger.info(f"Email sent successfully to {user_email}")
                except Exception as e:
                    logger.error(f"Failed to send email to {user_email}: {str(e)}")
        return jsonify({"message": str(e)}), 500


@benchmark_bp.route(
    "/queue-status/<int:submission_id>/<int:module_id>", methods=["GET"]
)
@jwt_required()
def get_queue_status(submission_id, module_id):
    """Get queue status for a specific submission and module."""
    try:
        user_id = get_jwt_identity()

        # Verify the submission belongs to the user
        submission = (
            db.session.query(Submission)
            .filter_by(id=submission_id, user_id=user_id)
            .first()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        position_info = QueueService.get_queue_position(submission_id, module_id)
        if not position_info:
            return jsonify({"message": "Not in queue"}), 404

        module_status = QueueService.get_module_queue_status(module_id)

        return (
            jsonify(
                {
                    "queue_position_info": position_info,
                    "module_queue_status": module_status,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        return jsonify({"message": str(e)}), 500


@benchmark_bp.route("/module/<int:module_id>/queue", methods=["GET"])
@jwt_required()
def get_module_queue(module_id):
    """Get the current queue for a specific module."""
    try:
        queue_entries = (
            db.session.query(BenchmarkQueue)
            .filter_by(module_id=module_id)
            .filter(
                BenchmarkQueue.status.in_([QueueStatus.WAITING, QueueStatus.PROCESSING])
            )
            .order_by(BenchmarkQueue.position.asc())
            .all()
        )

        queue_data = []
        for entry in queue_entries:
            queue_data.append(
                {
                    "position": entry.position,
                    "status": entry.status.value,
                    "user_id": entry.user_id,
                    "submission_id": entry.submission_id,
                    "created_at": entry.created_at.isoformat(),
                    "started_at": (
                        entry.started_at.isoformat() if entry.started_at else None
                    ),
                }
            )

        return (
            jsonify(
                {
                    "module_id": module_id,
                    "queue": queue_data,
                    "total_in_queue": len(queue_data),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error getting module queue: {e}")
        return jsonify({"message": str(e)}), 500


@benchmark_bp.route("/task-status/<task_id>", methods=["GET"])
@jwt_required()
def task_status(task_id):
    """Get the status of a task."""
    task = run_benchmark_task.AsyncResult(task_id)
    logger.info(f"Checking status for task {task_id}: {task.state}")

    if task.state == "PENDING":
        response = {
            "state": task.state,
            "current": 0,
            "total": 100,
            "status": "Pending...",
            "processedRows": 0,
            "totalRows": 0,
        }
    elif task.state == "FAILURE":
        # Handle the failure case properly
        error_msg = str(task.result) if task.result else "Unknown error occurred"
        response = {
            "state": task.state,
            "current": 0,
            "total": 100,
            "status": error_msg,
            "processedRows": 0,
            "totalRows": 0,
            "error": error_msg,
        }
        logger.error(f"Task {task_id} failed: {error_msg}")
    elif task.state == "SUCCESS":
        result = task.result
        response = {
            "state": task.state,
            "current": 100,
            "total": 100,
            "status": "Task completed!",
            "score": result.get("score") if isinstance(result, dict) else None,
            "processedRows": (
                result.get("processedRows", 0) if isinstance(result, dict) else 0
            ),
            "totalRows": result.get("totalRows", 0) if isinstance(result, dict) else 0,
        }
        logger.info(f"Task {task_id} completed with score {response['score']}")
    else:
        # Handle PROGRESS state
        try:
            info = task.info
            if isinstance(info, dict):
                response = {
                    "state": task.state,
                    "current": info.get("current", 0),
                    "total": info.get("total", 100),
                    "status": info.get("status", ""),
                    "score": info.get("score"),
                    "processedRows": info.get("processedRows", 0),
                    "totalRows": info.get("totalRows", 0),
                }
            else:
                # Handle unexpected info format
                response = {
                    "state": task.state,
                    "current": 0,
                    "total": 100,
                    "status": "Processing...",
                    "processedRows": 0,
                    "totalRows": 0,
                }
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            response = {
                "state": "FAILURE",
                "current": 0,
                "total": 100,
                "status": f"Error getting task status: {str(e)}",
                "processedRows": 0,
                "totalRows": 0,
                "error": str(e),
            }
        logger.info(f"Task {task_id} in progress: {response}")

    return jsonify(response)


@benchmark_bp.route("/run-benchmark/update", methods=["POST"])
@jwt_required()
def benchmark_update():
    """Queue selected modules for update for an OUTDATED submission."""
    try:
        response_headers = {
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

        if request.method == "OPTIONS":
            logger.info("CORS preflight request received")
            return ("", 204, response_headers)

        request_data = request.get_json() or {}
        submission_id = request_data.get("submissionId")
        selected_module_ids = request_data.get("selectedModuleIds")  # optional

        if not submission_id:
            return (
                jsonify({"message": "Missing submission_id in request body"}),
                400,
                response_headers,
            )

        user_id = get_jwt_identity()
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({"message": "Submission not found"}), 404, response_headers

        if str(submission.user_id) != str(user_id):
            return jsonify({"message": "Unauthorized"}), 403, response_headers

        if submission.status != SubmissionStatus.OUTDATED:
            return jsonify({"message": "Submission is already up-to-date"}), 200

        # Compute modules needing update, then filter by selection if provided
        computed = _compute_modules_to_update(submission)
        by_id = {module["module_id"]: module for module in computed}

        if selected_module_ids:
            modules_to_update = [
                by_id[mid] for mid in selected_module_ids if mid in by_id
            ]
        else:
            modules_to_update = computed

        if not modules_to_update:
            return jsonify({"message": "No modules to update"}), 200, response_headers

        # Add to queue
        queue_entries = []
        immediate_tasks = []

        # Preload modules to reduce queries
        module_ids = [m["module_id"] for m in modules_to_update]
        modules = (
            db.session.query(BenchmarkModule)
            .filter(BenchmarkModule.id.in_(module_ids))
            .all()
        )
        modules_map = {m.id: m for m in modules}

        for info in modules_to_update:
            module = modules_map.get(info["module_id"])
            if not module:
                continue

            dataset = (
                Dataset.query.get(module.dataset_id) if module.dataset_id else None
            )

            privatized_dataset = None
            if dataset:
                privatized_dataset = PrivatizedDataset.query.filter_by(
                    submission_id=submission_id, original_dataset_id=module.dataset_id
                ).first()

            # If dataset upload is required, ensure privatized dataset exists
            if info["requires_dataset_upload"] and not privatized_dataset:
                logger.warning(
                    f"Required privatized dataset missing for submission {submission_id}, module {module.id}"
                )
                # Skip queueing this module
                continue

            queue_entry = QueueService.add_to_queue(
                submission_id=submission_id, module_id=module.id, user_id=user_id
            )
            if not queue_entry:
                continue

            position_info = QueueService.get_queue_position(submission_id, module.id)
            queue_entries.append(
                {
                    "module_id": module.id,
                    "module_name": module.name,
                    "queue_entry_id": queue_entry.id,
                    "position": (
                        position_info.get("position") if position_info else None
                    ),
                    "status": (
                        position_info.get("status") if position_info else "waiting"
                    ),
                }
            )

            if position_info and position_info.get("position") == 1:
                task_result = BenchmarkService.process_module_queue_entry(
                    queue_entry, module, dataset, privatized_dataset
                )
                if task_result:
                    immediate_tasks.append(task_result)
                    for item in queue_entries:
                        if item["queue_entry_id"] == queue_entry.id:
                            item["status"] = "processing"
                            break

        if not queue_entries:
            return (
                jsonify(
                    {
                        "message": "No modules could be queued. Some modules may require dataset upload first."
                    }
                ),
                400,
                response_headers,
            )

        response_data = {
            "submission_id": submission_id,
            "queue_entries": queue_entries,
            "immediate_tasks": immediate_tasks,
            "message": f"Queued {len(queue_entries)} module(s) for update.",
        }
        if immediate_tasks:
            response_data["task_ids"] = immediate_tasks

        return jsonify(response_data), 202, response_headers

    except Exception as e:
        logger.error(f"Error in benchmark update endpoint: {str(e)}", exc_info=True)
        return jsonify({"message": str(e)}), 500, response_headers


@benchmark_bp.route("/submission/finalize-update", methods=["POST"])
@jwt_required()
def finalize_submission_update():
    """
    Calculates and saves a new version score after an update.
    """
    data = request.get_json()
    submission_id = data.get("submissionId")
    user_id = get_jwt_identity()

    submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
    if not submission:
        return jsonify({"message": "Submission not found"}), 404

    all_scores = submission.benchmark_scores
    if not all_scores:
        return jsonify({"message": "No scores found for this submission."}), 400

    # Calculate the new overall score by averaging all module scores.
    new_scores_sum = sum(s.score for s in all_scores)
    new_module_count = len(all_scores)
    new_overall_score = new_scores_sum / new_module_count

    current_app_version_str = AppVersion.get_current_version()
    significant_version = get_significant_version(current_app_version_str)

    # Check if version entry already exists
    existing_version = (
        db.session.query(SubmissionVersionScore)
        .filter_by(submission_id=submission.id, version=significant_version)
        .first()
    )

    if not existing_version:
        all_modules_for_new_version = [score.benchmark_module for score in all_scores]
        # Create the new version score entry only if it doesn't exist
        new_version_entry = SubmissionVersionScore(
            submission_id=submission.id,
            version=significant_version,
            score=new_overall_score,
            modules=all_modules_for_new_version,
        )
        db.session.add(new_version_entry)
        logger.info(
            f"Created new version entry for update: submission {submission.id}, version {current_app_version_str}"
        )

    # Update the main submission
    submission.score = new_overall_score
    submission.version = significant_version
    submission.status = SubmissionStatus.COMPLETED
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Submission updated to new version successfully",
                "new_version": significant_version,
                "new_score": new_overall_score,
            }
        ),
        200,
    )


@benchmark_bp.route("/cancel-benchmark/<submission_id>", methods=["POST"])
@jwt_required()
def cancel_benchmark(submission_id):
    """Cancel all benchmark tasks for a submission and clean up related entries."""
    try:
        user_id = get_jwt_identity()
        submission = Submission.query.get(submission_id)

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        if str(submission.user_id) != user_id:
            return jsonify({"message": "Unauthorized"}), 403

        # Update submission status
        submission.status = SubmissionStatus.CANCELLED
        db.session.commit()

        # Cancel all queue entries for this submission
        from ..models.benchmark_queue import BenchmarkQueue, QueueStatus

        queue_entries = (
            db.session.query(BenchmarkQueue)
            .filter_by(submission_id=submission_id)
            .filter(
                BenchmarkQueue.status.in_([QueueStatus.WAITING, QueueStatus.PROCESSING])
            )
            .all()
        )

        # Collect affected modules BEFORE changing the status
        affected_modules = set(
            entry.module_id
            for entry in queue_entries
            if entry.status == QueueStatus.PROCESSING
        )

        cancelled_tasks = []
        for entry in queue_entries:
            # If the entry has a task_id, try to revoke it
            if entry.task_id:
                try:
                    celery.control.revoke(entry.task_id, terminate=True)
                    cancelled_tasks.append(entry.task_id)
                    logger.info(
                        f"Revoked task {entry.task_id} for queue entry {entry.id}"
                    )
                except Exception as e:
                    logger.warning(f"Could not revoke task {entry.task_id}: {e}")

            # Mark queue entry as cancelled
            entry.status = QueueStatus.CANCELLED
            entry.completed_at = datetime.utcnow()
            logger.info(f"Cancelled queue entry {entry.id}")

        db.session.commit()

        # Process next entries in queue for each affected module
        for module_id in affected_modules:
            try:
                next_result = BenchmarkService.process_next_in_queue(module_id)
                if next_result:
                    logger.info(
                        f"Started next task in queue for module {module_id}: {next_result['task_id']}"
                    )
                else:
                    logger.info(f"No more tasks in queue for module {module_id}")
            except Exception as e:
                logger.error(
                    f"Error processing next in queue for module {module_id}: {e}"
                )

        # Delete all benchmark scores for this submission
        BenchmarkScore.query.filter_by(submission_id=submission_id).delete()
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Benchmark cancelled successfully",
                    "cancelled_queue_entries": len(queue_entries),
                    "cancelled_tasks": cancelled_tasks,
                    "affected_modules": list(affected_modules),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error cancelling benchmark: {str(e)}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@benchmark_bp.route("/delete-latest-submission", methods=["POST"])
@jwt_required()
def delete_latest_submission():
    """Delete the latest submission and cascade deletion to related records."""
    try:
        user_id = get_jwt_identity()

        # Get the latest submission for the user
        submission = (
            db.session.query(Submission)
            .filter_by(user_id=user_id)
            .order_by(Submission.created_at.desc())
            .first()
        )

        if not submission:
            return jsonify({"message": "No submissions found"}), 404

        # Delete all benchmark scores for this submission
        BenchmarkScore.query.filter_by(submission_id=submission.id).delete()

        # Delete all privatized datasets for this submission
        PrivatizedDataset.query.filter_by(submission_id=submission.id).delete()

        # Delete the submission itself
        db.session.delete(submission)
        db.session.commit()

        # Revoke any running tasks in Celery
        celery.control.purge()

        return jsonify({"message": "Latest submission deleted successfully"}), 200

    except Exception as e:
        logger.error(f"Error deleting latest submission: {str(e)}")
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@benchmark_bp.route("/submission/<int:submission_id>/updates-info", methods=["GET"])
@jwt_required()
def get_submission_updates_info(submission_id: int):
    """Return which modules for this submission require updates and why."""
    try:
        user_id = get_jwt_identity()

        submission = (
            db.session.query(Submission)
            .filter_by(id=submission_id, user_id=user_id)
            .first()
        )
        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        if submission.status != SubmissionStatus.OUTDATED:
            return jsonify({"message": "Submission is already up-to-date"}), 200

        modules_to_update = _compute_modules_to_update(submission)

        return (
            jsonify(
                {
                    "submission_id": submission.id,
                    "modules_to_update": modules_to_update,
                    "dataset_modules": [
                        module
                        for module in modules_to_update
                        if module["requires_dataset_upload"]
                    ],
                    "rerun_modules": [
                        module
                        for module in modules_to_update
                        if not module["requires_dataset_upload"]
                    ],
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error getting submission updates info: {e}")
        return jsonify({"message": str(e)}), 500
