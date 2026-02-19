from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from ..models.user import User
from ..models.submission import Submission
from .. import db
from datetime import datetime, timedelta
import os

admin_bp = Blueprint("admin", __name__)

@admin_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    # Security: Verify the 'admin' claim in the JWT
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Administrative access required"}), 403

    days = request.args.get('days', default=30, type=int)
    period_start = datetime.utcnow() - timedelta(days=days)

    users = User.query.all()
    output = []

    for user in users:
        total_subs = len(user.submissions)
        
        recent_subs = Submission.query.filter(
            Submission.user_id == user.id,
            Submission.submission_date >= period_start
        ).count()

        output.append({
            "id": user.id,
            "username": user.username,
            "mailAddress": user.mail_address,
            "researchInstitute": user.research_institute,
            "dailyLimit": user.daily_submission_limit,
            "totalSubmissions": total_subs,
            "recentSubmissions": recent_subs
        })

    return jsonify(output), 200

@admin_bp.route('/admin/users/<int:user_id>/limit', methods=['PUT'])
@jwt_required()
def update_user_limit(user_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.get_json()
    new_limit = data.get('dailyLimit')

    if new_limit is None or int(new_limit) < 0:
        return jsonify({"message": "Invalid limit value"}), 400

    user = User.query.get_or_404(user_id)
    user.daily_submission_limit = int(new_limit)
    db.session.commit()

    return jsonify({"message": f"Updated limit for {user.username}"}), 200

@admin_bp.route('/user/admin-delete/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    user = User.query.get_or_404(user_id)
    
    if user.profile_picture_path:
        file_path = os.path.join(current_app.root_path, user.profile_picture_path.lstrip('/'))
        if os.path.exists(file_path):
            os.remove(file_path)

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User successfully deleted by administrator"}), 200