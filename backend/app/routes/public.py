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

from flask import Blueprint, jsonify
from ..models import (
    User,
    Submission,
)
from .. import db

public_bp = Blueprint("public", __name__)

@public_bp.route('/stats/summary', methods=['GET'])
def get_platform_stats():
    user_count = User.query.count()
    submission_count = Submission.query.filter_by(is_public=True).count()
    
    return jsonify({
        "userCount": user_count,
        "submissionCount": submission_count
    }), 200