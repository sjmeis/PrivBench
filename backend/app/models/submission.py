from ..extensions import db
from datetime import datetime
from enum import Enum

from .dataset import submission_datasets  # Import the association table

class SubmissionStatusEnum(Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    FAILED = "Failed"

class Submission(db.Model):
    __tablename__ = 'submission'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.Enum(SubmissionStatusEnum), nullable=False)
    is_public = db.Column(db.Boolean, nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='submissions')
    metadata = db.relationship('Metadata', uselist=False, back_populates='submission')
    privatized_datasets = db.relationship('PrivatizedDataset', back_populates='submission', lazy=True)
    benchmark_scores = db.relationship('BenchmarkScore', back_populates='submission', lazy=True)
    tasks = db.relationship('Task', back_populates='submission', lazy=True)

    # Many-to-many relationship with Dataset
    datasets = db.relationship('Dataset', secondary=submission_datasets, back_populates='submissions')
