from ..extensions import db
from datetime import datetime

class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.String(120), nullable=False)
    method = db.Column(db.String(120), nullable=False)
    submitted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)

    def __init__(self, name, method, submitted_by, score):
        self.name = name
        self.method = method
        self.submitted_by = submitted_by
        self.score = score
