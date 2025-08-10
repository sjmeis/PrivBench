from ..extensions import db
from datetime import datetime
from enum import Enum


class QueueStatus(Enum):
    WAITING = "waiting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BenchmarkQueue(db.Model):
    __tablename__ = "benchmark_queue"

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(
        db.Integer, db.ForeignKey("submission.id"), nullable=False
    )
    module_id = db.Column(
        db.Integer, db.ForeignKey("benchmark_module.id"), nullable=False
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    task_id = db.Column(db.String(255), nullable=True)  # Celery task ID
    position = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(QueueStatus), default=QueueStatus.WAITING)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    submission = db.relationship("Submission", backref="queue_entries")
    module = db.relationship("BenchmarkModule", backref="queue_entries")
    user = db.relationship("User", backref="queue_entries")

    def __repr__(self):
        return f"<BenchmarkQueue {self.id}: User {self.user_id}, Module {self.module_id}, Position {self.position}>"
