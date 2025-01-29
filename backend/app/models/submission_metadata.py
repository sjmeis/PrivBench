from ..extensions import db
from ..enums.metadata_license import License

class SubmissionMetadata(db.Model):
    __tablename__ = 'submission_metadata'

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submission.id'), nullable=False, unique=True)
    model_name = db.Column(db.String(120), nullable=False)
    model_description = db.Column(db.Text, nullable=False)
    license = db.Column(db.Enum(License), nullable=False)
    tags = db.Column(db.String(255), nullable=True)
    authors = db.Column(db.String(255), nullable=True)
    research_paper_url = db.Column(db.String(255), nullable=True)
    github_url = db.Column(db.String(255), nullable=True)
    bibtex_citation = db.Column(db.Text, nullable=True)

    # One-to-one relationship with Submission
    submission = db.relationship('Submission', back_populates='submission_metadata')
