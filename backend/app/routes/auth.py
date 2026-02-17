from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
    decode_token
)
from werkzeug.security import check_password_hash, generate_password_hash

from datetime import timedelta
from flask_mail import Message
from ..extensions import mail

from ..models.user import User
from .. import db
import re

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        if not request.is_json:
            return jsonify({"message": "Missing JSON in request!"}), 400

        data = request.get_json()

        if not all(k in data for k in ["username", "mailAddress", "password"]):
            return jsonify({"message": "All fields are required!"}), 400
        
        password = data.get('password').strip()
        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$', password):
            return jsonify({"message": "Password is too weak."}), 400

        # Validate username length and format if needed
        username = data["username"].strip()
        if len(username) < 3:
            return (
                jsonify({"message": "Username must be at least 3 characters long!"}),
                400,
            )

        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already taken!"}), 409

        # Check if email address format is valid
        mail_address = data["mailAddress"].strip()
        email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_regex, mail_address):
            return jsonify({"message": "Invalid email address format!"}), 400

        # Check if email address already in use
        if User.query.filter_by(mail_address=mail_address).first():
            return jsonify({"message": "Mail address already registered!"}), 409

        new_user = User(
            username=username,
            mail_address=mail_address,
            research_institute=data["researchInstitute"],
            password=password,
        )

        db.session.add(new_user)
        db.session.commit()

        # Create and set access token immediately after registration
        access_token = create_access_token(identity=str(new_user.id))
        response = jsonify({"message": "Registration successful!", "success": True})
        set_access_cookies(response, access_token)

        return response, 201

    except Exception as e:
        db.session.rollback()  # Rollback in case of error
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        if not request.is_json:
            return jsonify({"message": "Missing JSON in request!"}), 400

        data = request.get_json()

        # Validate required fields
        if not all(k in data for k in ["username", "password"]):
            return jsonify({"message": "All fields are required!"}), 400

        # Find user
        user = User.query.filter_by(username=data["username"].strip()).first()
        if not user or not check_password_hash(user.password, data["password"]):
            return jsonify({"message": "Invalid username or password!"}), 401

        access_token = create_access_token(identity=str(user.id))

        response = jsonify(
            {
                "message": "Login successful!",
                "success": True,
                "user": {"username": user.username, "id": user.id},
            }
        )
        set_access_cookies(response, access_token)

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500


@auth_bp.route("/user", methods=["GET"])
@jwt_required()
def get_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            return jsonify({"message": "User not found!"}), 404

        return (
            jsonify(
                {
                    "user": {
                        "mailAddress": user.mail_address,
                        "username": user.username,
                        "researchInstitute": user.research_institute,
                        "admin": user.admin,
                        "bio": user.bio,
                        "id": user.id,
                        "profilePicturePath": user.profile_picture_path
                    }
                }
            ),
            200,
        )

    except Exception as e:
        current_app.logger.error(f"Get user error: {str(e)}")
        return jsonify({"message": "Invalid token"}), 400


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        response = jsonify({"message": "Logout successful!"})
        unset_jwt_cookies(response)
        return response, 200

    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({"message": "Logout failed!"}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    email = request.get_json().get('email')
    user = User.query.filter_by(mail_address=email).first()

    if user:
        # Create a reset token valid for 15 minutes
        reset_token = create_access_token(
            identity=str(user.id), 
            expires_delta=timedelta(minutes=15),
            additional_claims={"reset": True}
        )
        
        # In production, this link points to your React frontend
        reset_url = f"https://privbench.com/reset-password/{reset_token}"
        
        msg = Message("Password Reset Request",
                      sender="noreply@privbench.com",
                      recipients=[email])
        msg.body = f"To reset your password, visit the following link: {reset_url}\nIf you did not make this request, simply ignore this email."
        mail.send(msg)

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('newPassword').strip()

    try:
        # Verify token and ensure it's a reset token
        decoded = decode_token(token)
        if not decoded.get('sub') or not decoded.get('reset'):
            return jsonify({"message": "Invalid token type"}), 400

        user = User.query.get(decoded['sub'])
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Validate new password strength
        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$', new_password):
            return jsonify({"message": "Password too weak"}), 400

        user.password = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({"message": "Password has been reset successfully!"}), 200

    except Exception:
        return jsonify({"message": "The reset link is invalid or has expired."}), 400