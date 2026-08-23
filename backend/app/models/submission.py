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
from ..enums import SubmissionStatus
from .dataset import submission_datasets


class Submission(db.Model):
    __tablename__ = "submission"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.Enum(SubmissionStatus), nullable=False)
    score = db.Column(db.Float, nullable=True)
    is_public = db.Column(db.Boolean, default=False, server_default='0', nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    outdated_at = db.Column(db.DateTime, nullable=True)
    version = db.Column(db.String(50), nullable=True)

    # Relationships
    user = db.relationship("User", back_populates="submissions")
    version_scores = db.relationship(
        "SubmissionVersionScore",
        back_populates="submission",
        cascade="all, delete-orphan",
    )
    submission_metadata = db.relationship(
        "SubmissionMetadata", uselist=False, back_populates="submission", cascade="all, delete-orphan"
    )
    privatized_datasets = db.relationship(
        "PrivatizedDataset", back_populates="submission", lazy=True, cascade="all, delete-orphan",
    )
    benchmark_scores = db.relationship(
        "BenchmarkScore", back_populates="submission", lazy=True, cascade="all, delete-orphan"
    )
    tasks = db.relationship("Task", back_populates="submission", lazy=True, cascade="all, delete-orphan")

    # Many-to-many relationship with Dataset
    datasets = db.relationship(
        "Dataset", secondary=submission_datasets, back_populates="submissions"
    )

    # Per-module dataset choices for this submission
    dataset_choices = db.relationship(
        "ModuleDatasetChoice",
        back_populates="submission",
        cascade="all, delete-orphan",
    )

    tasks_in_queue = db.relationship(
        "BenchmarkQueue",
        back_populates="submission",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
