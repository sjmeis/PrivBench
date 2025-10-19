from ..extensions import db
from ..enums.metadata_license import License


class BaseMetadata(db.Model):
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(120), nullable=False)
    model_description = db.Column(db.Text, nullable=False)
    license = db.Column(db.Enum(License), nullable=False)
    tags = db.Column(db.String(255), nullable=True)
    authors = db.Column(db.String(255), nullable=True)
    research_paper_url = db.Column(db.String(255), nullable=True)
    github_url = db.Column(db.String(255), nullable=True)
    bibtex_citation = db.Column(db.Text, nullable=True)
