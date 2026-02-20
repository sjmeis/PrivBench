from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from ..models.user import User
from ..models.submission import Submission
from ..models.dataset import Dataset
from .. import db
from datetime import datetime, timedelta
import os
from sqlalchemy import or_
from werkzeug.utils import secure_filename

admin_bp = Blueprint("admin", __name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")

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

@admin_bp.route('/datasets/<int:dataset_id>/replace', methods=['PUT'])
@jwt_required()
def replace_dataset_file(dataset_id):
    if not get_jwt().get("is_admin"):
        return jsonify({"message": "Unauthorized"}), 403

    dataset = Dataset.query.get_or_404(dataset_id)
    
    if 'file' not in request.files:
        return jsonify({"message": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    original_name = secure_filename(file.filename)
    
    old_path = os.path.join(DATASET_FOLDER, dataset.file_path)
    if os.path.exists(old_path):
        os.remove(old_path)

    upload_path = os.path.join(DATASET_FOLDER, original_name)
    file.save(upload_path)
    
    dataset.file_path = original_name
    dataset.created_at = datetime.utcnow() # Update timestamp
    db.session.commit()

    return jsonify({
        "message": f"Successfully replaced with {original_name}",
        "fileName": original_name
    }), 200

@admin_bp.route('/submissions', methods=['GET'])
@jwt_required()
def get_all_submissions_admin():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Unauthorized"}), 403
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    sort_by = request.args.get('sortBy', 'created_at')
    sort_order = request.args.get('sortOrder', 'desc')
    search = request.args.get('search', '').strip()

    #submissions = Submission.query.order_by(Submission.created_at.desc()).all()

    query = db.session.query(Submission).join(User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Submission.name.ilike(search_term),
            User.username.ilike(search_term),
            User.research_institute.ilike(search_term)
        ))

    sort_map = {
        'name': Submission.name,
        'username': User.username,
        'score': Submission.score,
        'date': Submission.created_at,
        'status': Submission.status
    }
    col = sort_map.get(sort_by, Submission.created_at)
    query = query.order_by(col.desc() if sort_order == 'desc' else col.asc())

    paginated = query.paginate(page=page, per_page=limit, error_out=False)
    
    return jsonify({
        "results": [{
            "id": sub.id,
            "name": sub.name,
            "username": sub.user.username,
            "userEmail": sub.user.mail_address,
            "status": sub.status.value,
            "score": sub.score,
            "isPublic": sub.is_public,
            "date": sub.created_at.isoformat(),
            "version": sub.version,
            "metadata": {
                "description": sub.submission_metadata.model_description if sub.submission_metadata else "N/A",
                "institute": sub.user.research_institute,
                "datasetCount": len(sub.datasets)
            }
        } for sub in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "currentPage": paginated.page
    }), 200

@admin_bp.route('/submissions/<int:sub_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_submission(sub_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    submission = Submission.query.get_or_404(sub_id)
    db.session.delete(submission)
    db.session.commit()
    return jsonify({"message": "Submission deleted by admin"}), 200

@admin_bp.route('/submissions/<int:sub_id>/toggle-visibility', methods=['PUT'])
@jwt_required()
def admin_toggle_visibility(sub_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    submission = Submission.query.get_or_404(sub_id)
    submission.is_public = not submission.is_public
    db.session.commit()
    
    status = "public" if submission.is_public else "private"
    return jsonify({"message": f"Submission is now {status}", "isPublic": submission.is_public}), 200