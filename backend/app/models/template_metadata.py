from .base_metadata import BaseMetadata
from ..extensions import db


class TemplateMetadata(BaseMetadata):
    __tablename__ = "template_metadata"

    template_name = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # Relationship
    user = db.relationship("User", backref=db.backref("template_metadata", lazy=True))
