from ..extensions import db
from datetime import datetime

# Association table for many-to-many relationship between Submission and Dataset
submission_datasets = db.Table(
    'submission_datasets',
    db.Column('submission_id', db.Integer, db.ForeignKey('submission.id'), primary_key=True),
    db.Column('dataset_id', db.Integer, db.ForeignKey('dataset.id'), primary_key=True)
)

class Dataset(db.Model):
    __tablename__ = 'dataset'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    # Many-to-many relationship with Submission
    submissions = db.relationship('Submission', secondary=submission_datasets, back_populates='datasets')

    # One-to-many relationship with PrivatizedDataset
    privatized_datasets = db.relationship('PrivatizedDataset', back_populates='original_dataset', lazy=True)

    # One-to-many relationship with BenchmarkModule
    benchmark_modules = db.relationship('BenchmarkModule', back_populates='dataset', lazy=True)
