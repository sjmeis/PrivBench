from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..extensions import db


class ModuleUpdate(db.Model):
    __tablename__ = "module_updates"

    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("benchmark_module.id"), nullable=False)
    is_updated = Column(Boolean, default=True, nullable=False)
    update_type = Column(String(50), nullable=False)  # 'new_module', 'modified'
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
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "version_id": self.version_id,
            "module_name": self.module.name if self.module else None,
        }
