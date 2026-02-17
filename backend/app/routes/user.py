from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required
)
from ..models.user import User
from .. import db
import re
import os
from werkzeug.utils import secure_filename

user_bp = Blueprint("user", __name__)

UPLOAD_FOLDER = os.path.join(current_app.root_path, 'static', 'uploads', 'profile_pics')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@user_bp.route('/user/profile-picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found!"}), 404

        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if file and allowed_file(file.filename):
            # Create directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Use a predictable name (e.g., user_1.jpg) to avoid filling up disk with duplicates
            extension = file.filename.rsplit('.', 1)[1].lower()
            filename = secure_filename(f"avatar_user_{user_id}.{extension}")
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            file.save(file_path)

            # Save the relative path in the DB
            # This path is what the frontend will use to fetch the image
            user.profile_picture_path = f"/static/uploads/profile_pics/{filename}"
            db.session.commit()

            return jsonify({
                "message": "Profile picture updated!",
                "path": user.profile_picture_path
            }), 200

        return jsonify({"error": "File type not allowed"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@user_bp.route('/user/profile-picture', methods=['DELETE'])
@jwt_required()
def delete_profile_picture():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.profile_picture_path:
            return jsonify({"message": "No profile picture to delete"}), 200

        # Optional: Remove physical file from disk
        file_path = os.path.join(current_app.root_path, user.profile_picture_path.lstrip('/'))
        if os.path.exists(file_path):
            os.remove(file_path)

        # Clear DB field
        user.profile_picture_path = None
        db.session.commit()

        return jsonify({"message": "Profile picture removed successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@user_bp.route('/user/update', methods=['PUT'])
@jwt_required()
def update_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found!"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        bio = data.get("bio")
        mail_address = data.get("mailAddress")
        research_institute = data.get("researchInstitute")
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if bio:
            user.bio = bio
        if mail_address:
            mail_address = mail_address.strip()
            if not re.match(email_regex, mail_address):
                return jsonify({"error": "Invalid email format!"}), 400

            # Check if email is already taken (excluding current user's email)
            existing_user = User.query.filter(User.mail_address == mail_address, User.id != user.id).first()
            if existing_user:
                return jsonify({"error": "Mail address already registered!"}), 409

            user.mail_address = mail_address
        if research_institute:
            user.research_institute = research_institute

        db.session.commit()

        return jsonify({
            "message": "User updated successfully!",
            "user": {
                "id": user.id,
                "username": user.username,
                "mailAddress": user.mail_address,
                "bio": user.bio,
                "researchInstitute": user.research_institute
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "An error occurred while updating the user!",
            "details": str(e)
        }), 500
