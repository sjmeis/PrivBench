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

# Association table for many-to-many: which datasets each module can use
module_dataset_compatibility = db.Table(
    "module_dataset_compatibility",
    db.Column(
        "module_id",
        db.Integer,
        db.ForeignKey("benchmark_module.id"),
        primary_key=True,
    ),
    db.Column(
        "dataset_id",
        db.Integer,
        db.ForeignKey("dataset.id"),
        primary_key=True,
    ),
)


class BenchmarkModule(db.Model):
    __tablename__ = "benchmark_module"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    version = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    path = db.Column(db.String(255), nullable=False)
    dataset_id = db.Column(db.Integer, db.ForeignKey("dataset.id"), nullable=True)
    description = db.Column(db.String(400), nullable=True)
    # device specification ('cpu', 'gpu')
    device_specification = db.Column(db.String(50), default="cpu")
    use_gpu = db.Column(db.Boolean, default=False)
    is_installed = db.Column(db.Boolean, default=False)
    sample_count = db.Column(db.Integer, nullable=False, default=1000)

    # Deterministic SHA-256 Fingerprints
    code_hash = db.Column(db.String(64), nullable=True)
    requirements_hash = db.Column(db.String(64), nullable=True)

    # One-to-many relationships
    benchmark_scores = db.relationship(
        "BenchmarkScore", back_populates="benchmark_module", lazy=True
    )
    tasks = db.relationship("Task", back_populates="benchmark_module", lazy=True)
    dataset = db.relationship("Dataset", back_populates="benchmark_modules")

    # Many-to-many: compatible datasets for this module
    compatible_datasets = db.relationship(
        "Dataset",
        secondary=module_dataset_compatibility,
        back_populates="compatible_modules",
    )

    # Many-to-many relationship back to SubmissionVersionScore
    submission_version_scores = db.relationship(
        "SubmissionVersionScore",
        secondary="version_score_modules",
        back_populates="modules",
    )
