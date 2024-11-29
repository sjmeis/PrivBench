from ..extensions import db
from datetime import datetime

class Task(db.Model):
    __tablename__ = 'task'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    result = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submission.id'), nullable=False)
    benchmark_module_id = db.Column(db.Integer, db.ForeignKey('benchmark_module.id'), nullable=False)

    # Relationships
    submission = db.relationship('Submission', back_populates='tasks')
    benchmark_module = db.relationship('BenchmarkModule', back_populates='tasks')
