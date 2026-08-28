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
from itsdangerous import URLSafeTimedSerializer

from datetime import timedelta
from flask_mail import Message
from ..extensions import mail, limiter
from ..utils.email_validator import is_disposable_email

from ..models.user import User
from .. import db
import re

auth_bp = Blueprint("auth", __name__)

def generate_verification_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-confirm')

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("3 per minute")
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

        # Block temp / bad domains
        if is_disposable_email(mail_address):
            return jsonify({
                "message": "Registration with disposable or temporary email addresses is not allowed. Please use an institutional or standard email provider."
            }), 400

        # Check if email address already in use
        if User.query.filter_by(mail_address=mail_address).first():
            return jsonify({"message": "Mail address already registered!"}), 409

        hashed_password = generate_password_hash(password)

        new_user = User(
            username=username,
            mail_address=mail_address,
            research_institute=data.get("researchInstitute", ""),
            password=hashed_password,
            is_verified=False
        )

        db.session.add(new_user)
        db.session.commit()

        token = generate_verification_token(new_user.mail_address)
        confirm_url = f"{current_app.config['FRONTEND_URL']}/verify-email/{token}"

        msg = Message("Confirm Your PrivBench Account", sender=current_app.config.get("MAIL_DEFAULT_SENDER"), recipients=[new_user.mail_address])
        msg.body = f"Hi {new_user.username},\n\nWelcome to PrivBench! Click here to verify your account: {confirm_url}\nThis link expires in 24 hours.\n\nBest regards,\nThe PrivBench Team"
        mail.send(msg)

        return jsonify({"message": "Verification email sent"}), 201

    except Exception as e:
        db.session.rollback()  # Rollback in case of error
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@auth_bp.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        # Token expires in 24 hours (86400 seconds)
        email = serializer.loads(token, salt='email-confirm', max_age=86400)
    except:
        return jsonify({"message": "The confirmation link is invalid or has expired."}), 400

    user = User.query.filter_by(mail_address=email).first_or_404()
    
    if user.is_verified:
        return jsonify({"message": "Account already verified."}), 200

    user.is_verified = True
    db.session.commit()
    return jsonify({"message": "Account verified successfully!"}), 200

@auth_bp.route("/resend-verification", methods=["POST"])
@limiter.limit("3 per minute")
def resend_verification():
    data = request.get_json()
    identifier = data.get("mailAddress")

    user = User.query.filter(
        (User.mail_address == identifier) | (User.username == identifier)
    ).first()

    if not user:
        return jsonify({"message": "If the account exists, a link has been sent."}), 200

    if user.is_verified:
        return jsonify({"message": "Account already verified."}), 400

    try:
        token = generate_verification_token(user.mail_address)
        confirm_url = f"{current_app.config['FRONTEND_URL']}/verify-email/{token}"

        msg = Message("Confirm Your PrivBench Account (Resend)", recipients=[user.mail_address])
        msg.body = f"Hi {user.username},\n\nYou requested a new verification link. Click here to verify your account: {confirm_url}\nThis link expires in 24 hours.\n\nBest regards,\nThe PrivBench Team"
        mail.send(msg)

        return jsonify({"message": "If the account exists, a link has been sent."}), 200
    except Exception as e:
        current_app.logger.error(f"Resend error: {str(e)}")
        return jsonify({"message": "Failed to send email. Please try again later."}), 500

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
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
        if not user.is_verified:
            return jsonify({"message": "Please verify your email address before logging in."}), 401

        additional_claims = {
            "is_admin": getattr(user, "admin", False),
            "is_superadmin": getattr(user, "is_superadmin", False),
        }
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

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
                        "profilePicturePath": user.profile_picture_path,
                        "isEmailPublic": user.is_email_public
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

@auth_bp.route("/auth/forgot-password", methods=["POST"])
@limiter.limit("3 per minute")
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    user = User.query.filter_by(mail_address=email).first()

    if user:
        # Create a reset token valid for 15 minutes
        reset_token = create_access_token(
            identity=str(user.id), 
            expires_delta=timedelta(minutes=15),
            additional_claims={"reset": True}
        )
        
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password/{reset_token}"
        sender_email = current_app.config.get("MAIL_DEFAULT_SENDER")
        
        msg = Message("Password Reset Request",
                      sender=sender_email,
                      recipients=[email])
        msg.body = f"To reset your password, visit the following link: {reset_url}\nIf you did not make this request, simply ignore this email."
        mail.send(msg)

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

@auth_bp.route("/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = data.get("token")
    new_password = (data.get("newPassword") or "").strip()

    try:
        decoded = decode_token(token)
        if not decoded.get('sub') or not decoded.get('reset'):
            return jsonify({"message": "Invalid token type"}), 400

        user = User.query.get(int(decoded['sub']))
        if not user:
            return jsonify({"message": "User not found"}), 404

        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$', new_password):
            return jsonify({"message": "Password too weak"}), 400

        user.password = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({"message": "Password has been reset successfully!"}), 200

    except Exception:
        return jsonify({"message": "The reset link is invalid or has expired."}), 400