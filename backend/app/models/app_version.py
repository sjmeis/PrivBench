# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from ..extensions import db
from datetime import datetime


class AppVersion(db.Model):
    __tablename__ = "app_version"

    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.Text, nullable=True)
    blueprint = db.Column(db.JSON, nullable=False)

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
