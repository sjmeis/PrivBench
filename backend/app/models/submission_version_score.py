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


version_score_modules = db.Table(
    "version_score_modules",
    db.Column(
        "submission_version_score_id",
        db.Integer,
        db.ForeignKey("submission_version_score.id"),
        primary_key=True,
    ),
    db.Column(
        "benchmark_module_id",
        db.Integer,
        db.ForeignKey("benchmark_module.id"),
        primary_key=True,
    ),
)


class SubmissionVersionScore(db.Model):
    __tablename__ = "submission_version_score"

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(
        db.Integer, db.ForeignKey("submission.id"), nullable=False
    )
    version = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    submission = db.relationship("Submission", back_populates="version_scores")

    # Many-to-many relationship to BenchmarkModule
    modules = db.relationship(
        "BenchmarkModule",
        secondary=version_score_modules,
        back_populates="submission_version_scores",
    )

    def __repr__(self):
        return f"<SubmissionVersionScore {self.submission_id} - v{self.version}: {self.score}>"
