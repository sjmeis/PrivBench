from flask import Blueprint, jsonify, request
from ..extensions import db, celery
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import BenchmarkModule, Submission, User, Dataset, PrivatizedDataset, BenchmarkScore
from ..enums import SubmissionStatus
from datetime import datetime
from app.tasks.run_benchmark import run_benchmark
from app.utils.dataset_loader import load_dataset
from app.utils.module_loader import load_benchmark_module
from app.utils.email_sender import send_email
from celery.utils.log import get_task_logger
from pathlib import Path
from datetime import datetime
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, func, cast, Numeric
from ..config import Config

logger = get_task_logger(__name__)

# //fixme: put this in dedicated service
@celery.task(bind=True)
def run_benchmark_task(self, module_path, module_name, dataset_path, priv_dataset_path, privatized_dataset_id,
                       submission_id, module_id, user_id):
    """Run a benchmark module as a Celery task."""
    logger.info(f"Starting benchmark task for module {module_name}")

    try:
        total_steps = 100
        total_rows = None

        # Stage 1: Initialization (10%)
        logger.info(f"Module {module_name}: Initialization stage")
        self.update_state(state='PROGRESS',
                          meta={'current': 10,
                                'total': total_steps,
                                'status': 'Initializing benchmark environment...',
                                'processedRows': 0,
                                'totalRows': 0})

        # Stage 2: Loading Module (30%)
        logger.info(f"Loading benchmark module from {module_path}")
        self.update_state(state='PROGRESS',
                          meta={'current': 15,
                                'total': total_steps,
                                'status': 'Loading benchmark module...',
                                'processedRows': 0,
                                'totalRows': 0})

        # Load datasets to get total row count
        dataset = load_dataset(dataset_path)
        total_rows = len(dataset)

        # Stage 3: Loading Datasets (50%)
        logger.info(f"Loading datasets from {dataset_path} and {priv_dataset_path}")
        self.update_state(state='PROGRESS',
                          meta={'current': 20,
                                'total': total_steps,
                                'status': f'Loading datasets (0/{total_rows} rows)...',
                                'processedRows': 0,
                                'totalRows': total_rows})

        # Stage 4: Running Benchmark (80%)
        logger.info(f"Starting benchmark execution")
        self.update_state(state='PROGRESS',
                          meta={'current': 30,
                                'total': total_steps,
                                'status': f'Processing 0/{total_rows} rows...',
                                'processedRows': 0,
                                'totalRows': total_rows})

        # Create a progress callback for the benchmark
        def progress_callback(processed_rows, score=None):
            current_meta = {
                'current': 30 + int((processed_rows / total_rows) * 70),
                'total': total_steps,
                'status': f'Processing {processed_rows}/{total_rows} rows...',
                'processedRows': processed_rows,
                'totalRows': total_rows,
                'score': score  # Include score in state update
            }
            self.update_state(
                state='PROGRESS',
                meta=current_meta
            )

        # Run benchmark and get score
        score = run_benchmark(
            module_path,
            module_id,
            module_name,
            dataset_path,
            priv_dataset_path,
            progress_callback
        )

        # Immediately update the task state with the score
        self.update_state(
            state='PROGRESS',
            meta={
                'current': 90,
                'total': total_steps,
                'status': 'Processing complete, saving results...',
                'processedRows': total_rows,
                'totalRows': total_rows,
                'score': float(score)
            }
        )

        logger.info(f"Benchmark completed with score: {score}")

        if score is None:
            raise ValueError("Benchmark returned None score")

        # Insert or update benchmark score in the database
        stmt = insert(BenchmarkScore).values(
            submission_id=submission_id,
            module_id=module_id,
            privatized_dataset_id=privatized_dataset_id,
            score=float(score),
            created_at=datetime.utcnow()
        ).on_conflict_do_update(
            index_elements=['submission_id', 'module_id'],  # Columns that make the row unique
            set_={
                'score': float(score),
                'created_at': datetime.utcnow()
            }
        )

        db.session.execute(stmt)
        db.session.commit()
        logger.info(f"Benchmark score upserted to the database for submission {submission_id}, module {module_id}")

        # Check if all modules for the submission have completed
        total_modules = db.session.query(BenchmarkModule).filter_by(is_active=True).count()
        completed_scores = db.session.query(BenchmarkScore).filter_by(submission_id=submission_id).count()

        submission = db.session.query(Submission).filter_by(id=submission_id).one_or_none()
        if total_modules == completed_scores and submission and submission.status == SubmissionStatus.COMPLETED:
            logger.info(f"All modules completed and submission {submission_id} is already marked as COMPLETED. Skipping further steps.")
        else:
            if total_modules == completed_scores:
                query = select(func.round(cast(func.avg(BenchmarkScore.score), Numeric(10, 2)), 2)).where(
                    BenchmarkScore.submission_id == submission_id
                )

                # Execute the query and fetch the overall score
                overall_score = db.session.execute(query).scalar()

                submission.score = overall_score
                submission.status = SubmissionStatus.COMPLETED
                db.session.commit()
                logger.info(f"Submission {submission_id} marked as Completed")

                user = User.query.get(user_id)
                if user and user.mail_address:
                    user_email = user.mail_address
                    subject = "Benchmark Completed"
                    frontend_url = Config.FRONTEND_URL
                    body = f"""
Dear {user.username},<br><br>

Your latest submission has been evaluated successfully.<br>

You can now visit the platform and see how your model performed.<br><br>

Best regards,<br>
PrivBench Team
"""

                    try:
                        send_email(user_email, subject, body, redirect_url=frontend_url)
                        logger.info(f"Email sent successfully to {user_email}")
                    except Exception as e:
                        logger.error(f"Failed to send email to {user_email}: {str(e)}")

        # Stage 5: Completion (100%)
        result = {
            'current': total_steps,
            'total': total_steps,
            'status': 'Benchmark completed successfully!',
            'score': float(score),
            'processedRows': total_rows,
            'totalRows': total_rows,
            'state': 'SUCCESS'
        }

        logger.info(f"Task completed successfully with result: {result}")
        return result

    except Exception as e:
        logger.error(f"Benchmark task failed for module {module_name}: {str(e)}", exc_info=True)
        result = {
            'current': 0,
            'total': total_steps,
            'status': f'Task failed: {str(e)}',
            'processedRows': 0,
            'totalRows': total_rows if 'total_rows' in locals() else 0,
            'state': 'FAILURE'
        }
        raise Exception(str(e))

benchmark_bp = Blueprint('benchmark', __name__)

@benchmark_bp.route('/run-benchmark', methods=['POST'])
@jwt_required()
def benchmark():
    """Endpoint to start benchmark tasks."""

    submission = None
    try:
        # Add CORS headers
        response_headers = {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }

        # Handle preflight OPTIONS request
        if request.method == 'OPTIONS':
            return ('', 204, response_headers)

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        logger.info(f"Starting benchmark for user {user_id}")
        
        # Print Celery configuration for debugging
        logger.info(f"Celery Config: {celery.conf}")
        
        # Retrieve latest submission
        submission = (db.session.query(Submission)
                    .filter_by(user_id=user_id)
                    .filter(Submission.status.in_([SubmissionStatus.PENDING, SubmissionStatus.IN_PROGRESS]))
                    .order_by(Submission.created_at.desc())
                    .first())

        # If no PENDING submission, try to find an IN_PROGRESS submission
        if not submission:
            submission = db.session.query(Submission).filter_by(
                user_id=user_id,
                status=SubmissionStatus.IN_PROGRESS
            ).first()

        if not submission:
            logger.error("No pending or in-progress submissions found")
            return jsonify({
                "message": "No pending or in-progress submissions found"
            }), 404, response_headers

        # Only update status if it's PENDING
        if submission.status == SubmissionStatus.PENDING:
            submission.status = SubmissionStatus.IN_PROGRESS
            db.session.commit()
            logger.info(f"Updated submission {submission.id} status to IN_PROGRESS")
        else:
            logger.info(f"Submission {submission.id} already in progress")
        
        # Start tasks for each module
        tasks = []
        benchmark_modules = db.session.query(BenchmarkModule).filter_by(is_active=True).all()
        
        for module in benchmark_modules:
            logger.info(f"Processing module: {module.name}")
            dataset = db.session.query(Dataset).filter_by(id=module.dataset_id).first()
            if not dataset:
                logger.error(f"Dataset not found for module {module.name}")
                continue
            
            privatized_dataset = db.session.query(PrivatizedDataset).filter_by(
                submission_id=submission.id,
                original_dataset_id=module.dataset_id
            ).first()
            if not privatized_dataset:
                logger.error(f"Privatized dataset not found for module {module.name}")
                continue
            
            # Log absolute paths for debugging
            logger.info(f"Module path: {Path(module.path).absolute()}")
            logger.info(f"Dataset path: {Path(dataset.file_path).absolute()}")
            logger.info(f"Privatized dataset path: {Path(privatized_dataset.file_path).absolute()}")
            
            logger.info(f"Starting task for module {module.name}")
            task = run_benchmark_task.delay(
                str(module.path),
                module.name,
                str(dataset.file_path),
                str(privatized_dataset.file_path),
                privatized_dataset.id,
                submission.id,
                module.id,
                user_id
            )
            
            tasks.append({
                "task_id": task.id,
                "module_id": module.id,
                "module_name": module.name
            })
            logger.info(f"Task created for module {module.name}: {task.id}")
        
        if not tasks:
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
            return jsonify({"message": "No benchmark tasks could be started"}), 400
            
        logger.info(f"Successfully started {len(tasks)} tasks")
        return jsonify({"task_ids": tasks}), 202, response_headers

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

@benchmark_bp.route('/task-status/<task_id>', methods=['GET'])
@jwt_required()
def task_status(task_id):
    """Get the status of a task."""
    task = run_benchmark_task.AsyncResult(task_id)
    logger.info(f"Checking status for task {task_id}: {task.state}")
    
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 100,
            'status': 'Pending...',
            'processedRows': 0,
            'totalRows': 0
        }
    elif task.state == 'FAILURE':
        # Handle the failure case properly
        error_msg = str(task.result) if task.result else "Unknown error occurred"
        response = {
            'state': task.state,
            'current': 0,
            'total': 100,
            'status': error_msg,
            'processedRows': 0,
            'totalRows': 0,
            'error': error_msg
        }
        logger.error(f"Task {task_id} failed: {error_msg}")
    elif task.state == 'SUCCESS':
        result = task.result
        response = {
            'state': task.state,
            'current': 100,
            'total': 100,
            'status': 'Task completed!',
            'score': result.get('score') if isinstance(result, dict) else None,
            'processedRows': result.get('processedRows', 0) if isinstance(result, dict) else 0,
            'totalRows': result.get('totalRows', 0) if isinstance(result, dict) else 0
        }
        logger.info(f"Task {task_id} completed with score {response['score']}")
    else:
        # Handle PROGRESS state
        try:
            info = task.info
            if isinstance(info, dict):
                response = {
                    'state': task.state,
                    'current': info.get('current', 0),
                    'total': info.get('total', 100),
                    'status': info.get('status', ''),
                    'score': info.get('score'),
                    'processedRows': info.get('processedRows', 0),
                    'totalRows': info.get('totalRows', 0)
                }
            else:
                # Handle unexpected info format
                response = {
                    'state': task.state,
                    'current': 0,
                    'total': 100,
                    'status': 'Processing...',
                    'processedRows': 0,
                    'totalRows': 0
                }
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            response = {
                'state': 'FAILURE',
                'current': 0,
                'total': 100,
                'status': f'Error getting task status: {str(e)}',
                'processedRows': 0,
                'totalRows': 0,
                'error': str(e)
            }
        logger.info(f"Task {task_id} in progress: {response}")
    
    return jsonify(response)

@benchmark_bp.route('/run-benchmark/update', methods=['POST'])
@jwt_required()
def benchmark_update():
    """Endpoint to run benchmark tasks for new modules only."""
    try:
        response_headers = {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }

        if request.method == 'OPTIONS':
            logger.info("CORS preflight request received")
            return ('', 204, response_headers)

        logger.info("Parsing request data")
        request_data = request.get_json()
        if not request_data or 'submissionId' not in request_data:
            logger.warning("Missing 'submissionId' in request body")
            return jsonify({"message": "Missing submission_id in request body"}), 400, response_headers

        submission_id = request_data['submissionId']
        logger.info(f"Parsed submission_id: {submission_id}")

        user_id = get_jwt_identity()
        logger.info(f"Retrieved user_id from JWT: {user_id}")

        # Get submission and verify ownership
        logger.info(f"Fetching submission with ID {submission_id}")

        submission = Submission.query.get(submission_id)
        if not submission:
            logger.warning(f"Submission with ID {submission_id} not found in the database")
            return jsonify({"message": "Submission not found"}), 404, response_headers

        logger.info(f"Fetching submission with user id {submission.user_id}")


        # if submission.user_id != user_id: //fixme: add this verificaiton
        #     logger.warning(f"Unauthorized access attempt by user {user_id} for submission {submission_id}")
        #     return jsonify({"message": "Unauthorized access to the submission"}), 403, response_headers

        # Get modules that don't have scores for this submission
        logger.info("Fetching completed module IDs")
        completed_module_ids = {score.module_id for score in submission.benchmark_scores}
        logger.info(f"Completed module IDs: {completed_module_ids}")

        logger.info("Fetching new modules for benchmarking")
        new_modules = BenchmarkModule.query.filter(
            BenchmarkModule.is_active == True,
            ~BenchmarkModule.id.in_(completed_module_ids) if completed_module_ids else True
        ).all()
        logger.info(f"Found {len(new_modules)} new modules to benchmark")

        if not new_modules:
            logger.info("No new modules to benchmark")
            return jsonify({"message": "No new modules to benchmark"}), 200, response_headers

        # Start tasks only for new modules
        tasks = []
        for module in new_modules:
            logger.info(f"Processing module: {module.name} (ID: {module.id})")
            dataset = Dataset.query.get(module.dataset_id)
            if not dataset:
                logger.warning(f"Dataset with ID {module.dataset_id} not found for module {module.name}")
                continue

            privatized_dataset = PrivatizedDataset.query.filter_by(
                submission_id=submission_id,
                original_dataset_id=module.dataset_id
            ).first()
            if not privatized_dataset:
                logger.warning(f"Privatized dataset not found for submission {submission_id} and dataset {module.dataset_id}")
                continue

            logger.info(f"Starting benchmark task for module {module.name}")
            task = run_benchmark_task.delay(
                str(module.path),
                module.name,
                str(dataset.file_path),
                str(privatized_dataset.file_path),
                privatized_dataset.id,
                submission_id,
                module.id,
                user_id
            )

            tasks.append({
                "task_id": task.id,
                "module_id": module.id,
                "module_name": module.name
            })
            logger.info(f"Task created for module {module.name} with task ID {task.id}")

        if not tasks:
            logger.warning("No tasks could be started")
            return jsonify({"message": "No tasks could be started"}), 400, response_headers

        logger.info(f"{len(tasks)} tasks successfully created")
        return jsonify({"task_ids": tasks}), 202, response_headers

    except Exception as e:
        logger.error(f"Error in benchmark update endpoint: {str(e)}", exc_info=True)
        return jsonify({"message": str(e)}), 500, response_headers

