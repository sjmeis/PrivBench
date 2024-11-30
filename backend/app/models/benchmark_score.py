from ..extensions import db
from datetime import datetime

class BenchmarkScore(db.Model):
    __tablename__ = 'benchmark_score'

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submission.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('benchmark_module.id'), nullable=False)
    privatized_dataset_id = db.Column(db.Integer, db.ForeignKey('privatized_dataset.id'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    submission = db.relationship('Submission', back_populates='benchmark_scores')
    benchmark_module = db.relationship('BenchmarkModule', back_populates='benchmark_scores')
    privatized_dataset = db.relationship('PrivatizedDataset', back_populates='benchmark_scores')
