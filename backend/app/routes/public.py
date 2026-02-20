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