from celery.utils.log import get_task_logger
from datetime import datetime
import pandas as pd
import shutil
import os
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
        """Run sequential dataset evaluation steps and aggregate averages."""
        module = db.session.query(BenchmarkModule).get(module_id)
        module_name = module.name
        module_path = module.path

        logger.info(f"Starting sequential evaluation task for module {module_name}")
        staged_sequences = []
        
        try:
            total_steps = 100

            self.update_state(
                state="PROGRESS",
                meta={"current": 10, "total": total_steps, "status": "Initializing environment..."},
            )

            from ..utils.dataset_sequencer import get_dataset_sequencer_paths
            staged_sequences = get_dataset_sequencer_paths(module, submission_id)
            
            total_rows_all_sets = 0
            for item in staged_sequences:
                if "total_rows" not in item:
                    try:
                        csv_path = item.get("original_path") or item.get("privatized_path")
                        if csv_path and os.path.exists(csv_path):
                            # Read only the header row to count lines quickly without eating memory
                            df_chunk = pd.read_csv(csv_path, usecols=[0])
                            item["total_rows"] = len(df_chunk)
                            logger.info(f"Dynamically calculated row fallback for {item.get('dataset_name')}: {item['total_rows']} rows")
                        else:
                            item["total_rows"] = 0
                    except Exception as calc_err:
                        logger.warning(f"Failed to calculate line index fallback for dataset file: {calc_err}")
                        item["total_rows"] = 0
                
                total_rows_all_sets += item["total_rows"]

            if total_rows_all_sets <= 0:
                logger.warning("Total evaluation rows evaluated to 0. Overriding boundary ceiling to 1 for calculation runtime stability.")
                total_rows_all_sets = 1

            accumulated_scores = []
            global_rows_processed = 0

            for sequence_idx, step_meta in enumerate(staged_sequences):
                dataset_name = step_meta["dataset_name"]
                orig_path = step_meta["original_path"]
                priv_path = step_meta["privatized_path"]
                step_rows = step_meta["total_rows"]

                logger.info(f"Running sub-sequence track [{sequence_idx + 1}/{len(staged_sequences)}]: {dataset_name}")

                def individual_progress_callback(processed_rows, current_score=None, *args, **kwargs):
                    nonlocal global_rows_processed
                    temp_total = global_rows_processed + processed_rows

                    status_text = args[0] if args else f"Evaluating dataset '{dataset_name}' ({processed_rows}/{step_rows} rows)..."
                    
                    current_meta = {
                        "current": 20 + int((temp_total / total_rows_all_sets) * 70),
                        "total": total_steps,
                        "status": f"Evaluating dataset '{dataset_name}' ({processed_rows}/{step_rows} rows)...",
                        "processedRows": temp_total,
                        "totalRows": total_rows_all_sets,
                    }
                    self.update_state(state="PROGRESS", meta=current_meta)

                step_score = run_benchmark(
                    module_path,
                    module_id,
                    module_name,
                    orig_path,
                    priv_path,
                    dataset_identifier=dataset_name,
                    progress_callback=individual_progress_callback
                )

                if step_score is not None:
                    accumulated_scores.append(step_score)
                else:
                    raise ValueError(f"Step track validation for {dataset_name} returned an invalid score signature.")

                global_rows_processed += step_rows

            if not accumulated_scores:
                raise ValueError("Evaluation sequence finished without output values.")
                
            final_averaged_score = sum(accumulated_scores) / len(accumulated_scores)
            logger.info(f"All sequential tracks processed. Computed sub-scores: {accumulated_scores} -> Final Average: {final_averaged_score}")

            self.update_state(
                state="PROGRESS",
                meta={
                    "current": 95,
                    "total": total_steps,
                    "status": "Saving averaged scores...",
                    "score": float(final_averaged_score)
                }
            )

            stmt = (
                insert(BenchmarkScore)
                .values(
                    submission_id=submission_id,
                    module_id=module_id,
                    privatized_dataset_id=None,
                    score=float(final_averaged_score),
                    created_at=datetime.utcnow(),
                )
                .on_conflict_do_update(
                    index_elements=["submission_id", "module_id"],
                    set_={"score": float(final_averaged_score), "created_at": datetime.utcnow()},
                )
            )
            db.session.execute(stmt)
            db.session.commit()
            logger.info(
                f"Benchmark score upserted to the database for submission {submission_id}, module {module_id}"
            )

            if queue_entry_id:
                QueueService.complete_processing(queue_entry_id, success=True)
                logger.info(f"Queue entry {queue_entry_id} marked as completed")

                # Process next in queue for this module
                next_result = BenchmarkService.process_next_in_queue(module_id)
                if next_result:
                    logger.info(f"Started next task in queue: {next_result['task_id']}")
                else:
                    logger.info(f"No more entries in queue for module {module_id}")

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

                    overall_score = db.session.execute(query).scalar()

                    submission.score = overall_score
                    submission.status = SubmissionStatus.COMPLETED

                    submission.is_public = False

                    submission.version = get_significant_version(submission.version)

                    existing_version = (
                        db.session.query(SubmissionVersionScore)
                        .filter_by(
                            submission_id=submission.id, version=submission.version
                        )
                        .first()
                    )

                    if not existing_version:
                        modules_in_run = (
                            db.session.query(BenchmarkModule)
                            .join(BenchmarkScore)
                            .filter(BenchmarkScore.submission_id == submission_id)
                            .all()
                        )
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
                        subject = "[PrivBench] Benchmark Run Completed"
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

            result = {
                "current": total_steps,
                "total": total_steps,
                "status": "Benchmark completed successfully!",
                "score": float(final_averaged_score),
                "state": "SUCCESS"
            }

            logger.info(f"Task completed successfully with result: {result}")
            return result

        except Exception as e:
            logger.error(f"Sequential processing failure encountered: {e}", exc_info=True)
            if queue_entry_id:
                QueueService.complete_processing(queue_entry_id, success=False)
                BenchmarkService.process_next_in_queue(module_id)
            raise Exception(str(e))

        finally:
            for step_meta in staged_sequences:
                t_dir = step_meta.get("temp_dir")
                if t_dir and os.path.exists(t_dir):
                    shutil.rmtree(t_dir, ignore_errors=True)

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
