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
