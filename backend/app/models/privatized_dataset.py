from ..extensions import db
from datetime import datetime

class PrivatizedDataset(db.Model):
    __tablename__ = 'privatized_dataset'

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submission.id'), nullable=False)
    original_dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processing_status = db.Column(db.String(50), nullable=False)

    # Relationships
    submission = db.relationship('Submission', back_populates='privatized_datasets')
    original_dataset = db.relationship('Dataset', back_populates='privatized_datasets')
    benchmark_scores = db.relationship('BenchmarkScore', back_populates='privatized_dataset', lazy=True)
