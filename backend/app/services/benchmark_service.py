from celery.utils.log import get_task_logger
from datetime import datetime
import shutil
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, func, cast, Numeric
from ..extensions import db, celery
from ..models import (
    BenchmarkModule,
    Submission,
    User,
    BenchmarkScore,
    SubmissionVersionScore,
)
from ..enums import SubmissionStatus
from ..tasks.run_benchmark import run_benchmark
from ..utils.dataset_loader import load_dataset
from ..utils.dataset_combiner import build_combined_datasets
from ..utils.email_sender import send_email
from ..utils.version_utils import get_significant_version
from ..config import Config
from .queue_service import QueueService

logger = get_task_logger(__name__)


@celery.task(bind=True)
def run_benchmark_task(
    self,
    module_id,
    submission_id,
    user_id,
    queue_entry_id=None,
):
    """Celery task for running benchmark"""
    return BenchmarkService.run_benchmark_task(
        self,
        module_id,
        submission_id,
        user_id,
        queue_entry_id,
    )


class BenchmarkService:
    @staticmethod
    def run_benchmark_task(
        self,
        module_id,
        submission_id,
        user_id,
        queue_entry_id=None,
    ):
        """Run a benchmark module as a Celery task with queue support."""
        module = db.session.query(BenchmarkModule).get(module_id)
        module_name = module.name
        module_path = module.path

        logger.info(
            f"Starting benchmark task for module {module_name}, queue_entry: {queue_entry_id}"
        )

        combined_dir = None
        try:
            total_steps = 100

            # Stage 1: Initialization (10%)
            logger.info(f"Module {module_name}: Initialization stage")
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 10,
                    "total": total_steps,
                    "status": "Initializing benchmark environment...",
                    "processedRows": 0,
                    "totalRows": 0,
                },
            )

            # Stage 2: Build combined datasets (15%)
            logger.info(f"Building combined datasets for module {module_name}")
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 15,
                    "total": total_steps,
                    "status": "Combining datasets...",
                    "processedRows": 0,
                    "totalRows": 0,
                },
            )

            dataset_path, priv_dataset_path = build_combined_datasets(
                module, submission_id
            )
            # Track the temp directory for cleanup
            import os

            combined_dir = os.path.dirname(dataset_path)

            # Load datasets to get total row count
            dataset = load_dataset(dataset_path)
            total_rows = len(dataset)

            # Stage 3: Loading Datasets (20%)
            logger.info(f"Loading datasets from {dataset_path} and {priv_dataset_path}")
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 20,
                    "total": total_steps,
                    "status": f"Loading datasets (0/{total_rows} rows)...",
                    "processedRows": 0,
                    "totalRows": total_rows,
                },
            )

            # Stage 4: Running Benchmark (30%)
            logger.info(f"Starting benchmark execution")
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 30,
                    "total": total_steps,
                    "status": f"Processing 0/{total_rows} rows...",
                    "processedRows": 0,
                    "totalRows": total_rows,
                },
            )

            # Create a progress callback for the benchmark
            def progress_callback(processed_rows, score=None, status_msg=None):
                current_meta = {
                    "current": 30 + int((processed_rows / total_rows) * 70),
                    "total": total_steps,
                    "status": status_msg or f"Processing {processed_rows}/{total_rows} rows...",
                    "processedRows": processed_rows,
                    "totalRows": total_rows,
                    "score": score,
                }
                self.update_state(state="PROGRESS", meta=current_meta)

            # Run benchmark and get score
            score = run_benchmark(
                module_path,
                module_id,
                module_name,
                dataset_path,
                priv_dataset_path,
                progress_callback,
            )

            # Immediately update the task state with the score
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 90,
                    "total": total_steps,
                    "status": "Processing complete, saving results...",
                    "processedRows": total_rows,
                    "totalRows": total_rows,
                    "score": float(score),
                },
            )

            logger.info(f"Benchmark completed with score: {score}")

            if score is None:
                raise ValueError("Benchmark returned None score")

            # Insert or update benchmark score in the database
            stmt = (
                insert(BenchmarkScore)
                .values(
                    submission_id=submission_id,
                    module_id=module_id,
                    # NOTE: privatized_dataset_id is intentionally set to None.
                    # Modules can now use multiple datasets, and dataset lineage
                    # is tracked via the new multi-dataset mechanism instead of
                    # this deprecated column on BenchmarkScore.
                    privatized_dataset_id=None,
                    score=float(score),
                    created_at=datetime.utcnow(),
                )
                .on_conflict_do_update(
                    index_elements=["submission_id", "module_id"],
                    set_={"score": float(score), "created_at": datetime.utcnow()},
                )
            )

            db.session.execute(stmt)
            db.session.commit()
            logger.info(
                f"Benchmark score upserted to the database for submission {submission_id}, module {module_id}"
            )

            # Mark queue entry as completed and process next in queue
            if queue_entry_id:
                QueueService.complete_processing(queue_entry_id, success=True)
                logger.info(f"Queue entry {queue_entry_id} marked as completed")

                # Process next in queue for this module
                next_result = BenchmarkService.process_next_in_queue(module_id)
                if next_result:
                    logger.info(f"Started next task in queue: {next_result['task_id']}")
                else:
                    logger.info(f"No more entries in queue for module {module_id}")

            # Check if all modules for the submission have completed
            total_modules = (
                db.session.query(BenchmarkModule).filter_by(is_active=True).count()
            )
            completed_scores = (
                db.session.query(BenchmarkScore)
                .filter_by(submission_id=submission_id)
                .count()
            )

            submission = (
                db.session.query(Submission).filter_by(id=submission_id).one_or_none()
            )

            if (
                total_modules == completed_scores
                and submission
                and submission.status == SubmissionStatus.COMPLETED
            ):
                logger.info(
                    f"All modules completed and submission {submission_id} is already marked as COMPLETED. Skipping further steps."
                )
            else:
                if total_modules == completed_scores:
                    query = select(
                        func.round(
                            cast(func.avg(BenchmarkScore.score), Numeric(10, 2)), 2
                        )
                    ).where(BenchmarkScore.submission_id == submission_id)

                    # Execute the query and fetch the overall score
                    overall_score = db.session.execute(query).scalar()

                    submission.score = overall_score
                    submission.status = SubmissionStatus.COMPLETED

                    submission.is_public = False

                    # Ensure submission version is significant (x.y.0)
                    submission.version = get_significant_version(submission.version)

                    # Check if version entry already exists before creating
                    existing_version = (
                        db.session.query(SubmissionVersionScore)
                        .filter_by(
                            submission_id=submission.id, version=submission.version
                        )
                        .first()
                    )

                    if not existing_version:
                        # Get all modules that were part of this run
                        modules_in_run = (
                            db.session.query(BenchmarkModule)
                            .join(BenchmarkScore)
                            .filter(BenchmarkScore.submission_id == submission_id)
                            .all()
                        )
                        # Create the first version score entry only if it doesn't exist
                        version_score = SubmissionVersionScore(
                            submission_id=submission.id,
                            version=submission.version,
                            score=overall_score,
                            modules=modules_in_run,
                        )
                        db.session.add(version_score)
                        logger.info(
                            f"Created new version entry for submission {submission_id}, version {submission.version}"
                        )
                    else:
                        logger.info(
                            f"Version entry already exists for submission {submission_id}, version {submission.version}"
                        )

                    db.session.commit()
                    logger.info(f"Submission {submission_id} marked as Completed")

                    # Send completion email
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
The PrivBench Team
"""

                        try:
                            send_email(
                                user_email,
                                subject,
                                body,
                                redirect_url=f"{frontend_url}/profile?state=submissions",
                            )
                            logger.info(f"Email sent successfully to {user_email}")
                        except Exception as e:
                            logger.error(
                                f"Failed to send email to {user_email}: {str(e)}"
                            )

            # Stage 5: Completion (100%)
            result = {
                "current": total_steps,
                "total": total_steps,
                "status": "Benchmark completed successfully!",
                "score": float(score),
                "processedRows": total_rows,
                "totalRows": total_rows,
                "state": "SUCCESS",
            }

            logger.info(f"Task completed successfully with result: {result}")
            return result

        except Exception as e:
            logger.error(
                f"Benchmark task failed for module {module_name}: {str(e)}",
                exc_info=True,
            )

            # Mark queue entry as failed and still process next in queue
            if queue_entry_id:
                QueueService.complete_processing(queue_entry_id, success=False)
                logger.info(f"Queue entry {queue_entry_id} marked as failed")

                # Still process next in queue even if this one failed
                next_result = BenchmarkService.process_next_in_queue(module_id)
                if next_result:
                    logger.info(
                        f"Started next task in queue after failure: {next_result['task_id']}"
                    )

            raise Exception(str(e))

        finally:
            # Clean up temporary combined dataset files
            if combined_dir:
                try:
                    shutil.rmtree(combined_dir, ignore_errors=True)
                    logger.info(f"Cleaned up temp directory: {combined_dir}")
                except Exception as cleanup_err:
                    logger.warning(f"Failed to clean up temp dir: {cleanup_err}")

    @staticmethod
    def process_module_queue_entry(queue_entry, module):
        """Process a specific queue entry by starting the benchmark task"""
        try:
            logger.info(
                f"Starting task for module {module.name} (queue entry {queue_entry.id})"
            )

            # Start the benchmark task with queue entry ID
            task = run_benchmark_task.delay(
                module.id,
                queue_entry.submission_id,
                queue_entry.user_id,
                queue_entry_id=queue_entry.id,
            )

            # Mark as processing in queue
            QueueService.start_processing(queue_entry.id, task.id)

            logger.info(f"Task created for module {module.name}: {task.id}")

            return {
                "task_id": task.id,
                "module_id": module.id,
                "module_name": module.name,
                "queue_entry_id": queue_entry.id,
            }

        except Exception as e:
            logger.error(f"Error starting task for module {module.name}: {e}")
            # Mark queue entry as failed
            QueueService.complete_processing(queue_entry.id, success=False)
            return None

    @staticmethod
    def process_next_in_queue(module_id):
        """Process the next entry in queue for a specific module"""
        try:
            next_entry = QueueService.get_next_in_queue(module_id)
            if not next_entry:
                logger.info(f"No more entries in queue for module {module_id}")
                return None

            # Get the module
            module = db.session.query(BenchmarkModule).get(module_id)

            # Process this queue entry
            result = BenchmarkService.process_module_queue_entry(next_entry, module)

            if result:
                logger.info(
                    f"Started processing next queue entry {next_entry.id} for module {module.name}"
                )
            else:
                logger.error(
                    f"Failed to start processing next queue entry {next_entry.id}"
                )

            return result

        except Exception as e:
            logger.error(f"Error processing next in queue for module {module_id}: {e}")
            return None
