from ..extensions import db
from datetime import datetime


class AppVersion(db.Model):
    __tablename__ = "app_version"

    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AppVersion {self.version}>"

    @staticmethod
    def get_current_version():
        """Gets the current application version."""
        version_obj = AppVersion.query.order_by(AppVersion.created_at.desc()).first()
        return version_obj.version if version_obj else "1.0.0"

    @staticmethod
    def increment_version():
        """Increments the patch number of the version."""
        current_version_str = AppVersion.get_current_version()
        major, minor, patch = map(int, current_version_str.split("."))
        new_version_str = f"{major}.{minor}.{patch + 1}"

        new_version = AppVersion(version=new_version_str)
        db.session.add(new_version)
        db.session.commit()
        return new_version_str
