from ..models.benchmark_queue import BenchmarkQueue, QueueStatus
from ..extensions import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class QueueService:
    @staticmethod
    def add_to_queue(submission_id, module_id, user_id):
        """Add a new entry to the queue for a specific module"""
        try:
            # Get the next position for this module
            last_position = (
                db.session.query(BenchmarkQueue.position)
                .filter_by(module_id=module_id)
                .filter(
                    BenchmarkQueue.status.in_(
                        [QueueStatus.WAITING, QueueStatus.PROCESSING]
                    )
                )
                .order_by(BenchmarkQueue.position.desc())
                .first()
            )

            next_position = (last_position[0] + 1) if last_position else 1

            # Create queue entry
            queue_entry = BenchmarkQueue(
                submission_id=submission_id,
                module_id=module_id,
                user_id=user_id,
                position=next_position,
                status=QueueStatus.WAITING,
            )

            db.session.add(queue_entry)
            db.session.commit()

            logger.info(
                f"Added queue entry: User {user_id}, Module {module_id}, Position {next_position}"
            )
            return queue_entry

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding to queue: {e}")
            raise

    @staticmethod
    def get_queue_position(submission_id, module_id):
        """Get the current position in queue for a specific submission and module"""
        try:
            queue_entry = (
                db.session.query(BenchmarkQueue)
                .filter_by(submission_id=submission_id, module_id=module_id)
                .first()
            )

            if not queue_entry:
                return None

            return {
                "queue_id": queue_entry.id,
                "position": queue_entry.position,
                "status": queue_entry.status.value,
                "created_at": queue_entry.created_at.isoformat(),
                "started_at": (
                    queue_entry.started_at.isoformat()
                    if queue_entry.started_at
                    else None
                ),
            }

        except Exception as e:
            logger.error(f"Error getting queue position: {e}")
            return None

    @staticmethod
    def get_next_in_queue(module_id):
        """Get the next entry to process for a module"""
        try:
            return (
                db.session.query(BenchmarkQueue)
                .filter_by(module_id=module_id, status=QueueStatus.WAITING)
                .order_by(BenchmarkQueue.position.asc())
                .first()
            )
        except Exception as e:
            logger.error(f"Error getting next in queue: {e}")
            return None

    @staticmethod
    def start_processing(queue_entry_id, task_id):
        """Mark a queue entry as processing"""
        try:
            queue_entry = db.session.query(BenchmarkQueue).get(queue_entry_id)
            if queue_entry:
                queue_entry.status = QueueStatus.PROCESSING
                queue_entry.task_id = task_id
                queue_entry.started_at = datetime.utcnow()
                db.session.commit()
                logger.info(f"Started processing queue entry {queue_entry_id}")
                return queue_entry
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error starting processing: {e}")
            return None

    @staticmethod
    def complete_processing(queue_entry_id, success=True):
        """Mark a queue entry as completed or failed"""
        try:
            queue_entry = db.session.query(BenchmarkQueue).get(queue_entry_id)
            if queue_entry:
                queue_entry.status = (
                    QueueStatus.COMPLETED if success else QueueStatus.FAILED
                )
                queue_entry.completed_at = datetime.utcnow()
                db.session.commit()
                logger.info(
                    f"Completed processing queue entry {queue_entry_id} with success={success}"
                )
                return queue_entry
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error completing processing: {e}")
            return None

    @staticmethod
    def get_module_queue_status(module_id):
        """Get the current queue status for a module"""
        try:
            waiting_count = (
                db.session.query(BenchmarkQueue)
                .filter_by(module_id=module_id, status=QueueStatus.WAITING)
                .count()
            )

            processing_count = (
                db.session.query(BenchmarkQueue)
                .filter_by(module_id=module_id, status=QueueStatus.PROCESSING)
                .count()
            )

            return {
                "module_id": module_id,
                "waiting": waiting_count,
                "processing": processing_count,
                "total_in_queue": waiting_count + processing_count,
            }
        except Exception as e:
            logger.error(f"Error getting module queue status: {e}")
            return None
