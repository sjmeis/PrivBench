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
