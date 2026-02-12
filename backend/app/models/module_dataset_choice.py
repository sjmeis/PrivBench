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
