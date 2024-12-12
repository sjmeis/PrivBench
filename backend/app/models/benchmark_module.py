from ..extensions import db
from datetime import datetime

class BenchmarkModule(db.Model):
    __tablename__ = 'benchmark_module'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    version = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    path = db.Column(db.String(255), nullable=False)
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False)
    description = db.Column(db.String(400), nullable=True)

    # One-to-many relationships
    benchmark_scores = db.relationship('BenchmarkScore', back_populates='benchmark_module', lazy=True)
    tasks = db.relationship('Task', back_populates='benchmark_module', lazy=True)
    dataset = db.relationship('Dataset', back_populates='benchmark_modules')
