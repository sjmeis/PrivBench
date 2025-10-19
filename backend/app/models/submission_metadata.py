from ..extensions import db
from .base_metadata import BaseMetadata


class SubmissionMetadata(BaseMetadata):
    __tablename__ = "submission_metadata"

    submission_id = db.Column(
        db.Integer, db.ForeignKey("submission.id"), nullable=False, unique=True
    )

    # One-to-one relationship with Submission
    submission = db.relationship("Submission", back_populates="submission_metadata")
