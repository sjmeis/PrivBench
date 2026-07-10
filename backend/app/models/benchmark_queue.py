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
        db.Integer, db.ForeignKey("submission.id", ondelete="CASCADE"), nullable=False
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
