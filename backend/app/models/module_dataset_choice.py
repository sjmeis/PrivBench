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


class ModuleDatasetChoice(db.Model):
    __tablename__ = "module_dataset_choice"

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(
        db.Integer, db.ForeignKey("submission.id"), nullable=False
    )
    module_id = db.Column(
        db.Integer, db.ForeignKey("benchmark_module.id"), nullable=False
    )
    dataset_id = db.Column(
        db.Integer, db.ForeignKey("dataset.id"), nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("submission_id", "module_id", name="uq_submission_module_dataset_choice"),
    )

    # Relationships
    submission = db.relationship("Submission", back_populates="dataset_choices")
    module = db.relationship("BenchmarkModule")
    dataset = db.relationship("Dataset")
