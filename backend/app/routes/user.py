from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required
)
from ..models.user import User
from .. import db
import re

user_bp = Blueprint("user", __name__)

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
