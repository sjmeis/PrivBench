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

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..extensions import db


class ModuleUpdate(db.Model):
    __tablename__ = "module_updates"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("benchmark_module.id"), nullable=False)
    is_updated = Column(Boolean, default=True, nullable=False)
    update_type = Column(
        String(50), nullable=False
    )  # 'new_module', 'modified', 'deleted'
    change_level = Column(
        String(10), default="minor", nullable=False
    )  # 'major' or 'minor'
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    version_id = Column(Integer, ForeignKey("app_version.id"), nullable=True)

    # Relationships
    module = relationship("BenchmarkModule", backref="updates")
    version = relationship("AppVersion", backref="module_updates")

    def to_dict(self):
        return {
            "id": self.id,
            "module_id": self.module_id,
            "is_updated": self.is_updated,
            "update_type": self.update_type,
            "change_level": self.change_level,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "version_id": self.version_id,
            "module_name": self.module.name if self.module else None,
        }
