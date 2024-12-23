from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies
)
from werkzeug.security import check_password_hash
from ..models.user import User
from .. import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        if not request.is_json:
            return jsonify({"message": "Missing JSON in request"}), 400
            
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ["username", "mailAddress", "password"]):
            return jsonify({"message": "All fields are required"}), 400
        
        # Validate username length and format if needed
        username = data["username"].strip()
        if len(username) < 3:
            return jsonify({"message": "Username must be at least 3 characters long"}), 400
            
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already taken"}), 409

        #//TODO: check also if is valid mail address in with regex

        mail_address = data["mailAddress"].strip()
        if User.query.filter_by(mail_address=mail_address).first():
            return jsonify({"message": "Mail address already registered"}), 409
            
        # Create new user
        new_user = User(
            username=username,
            mail_address=mail_address,
            research_institute=data["researchInstitute"],
            password=data["password"]
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Create and set access token immediately after registration
        access_token = create_access_token(identity=str(new_user.id))
        response = jsonify({
            "message": "Registration successful",
            "success": True
        })
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
            return jsonify({"message": "Missing JSON in request"}), 400
            
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ["username", "password"]):
            return jsonify({"message": "All fields are required"}), 400
        
        # Find user
        user = User.query.filter_by(username=data["username"].strip()).first()
        if not user or not check_password_hash(user.password, data["password"]):
            return jsonify({"message": "Invalid username or password"}), 401
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        # Create response with token in cookie
        response = jsonify({
            "message": "Login successful",
            "success": True,
            "user": {
                "username": user.username,
                "id": user.id
            }
        })
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
            return jsonify({"message": "User not found"}), 404
            
        return jsonify({
            "user": {
                "mailAddress": user.mail_address,
                "username": user.username,
                "researchInstitute": user.research_institute,
                "admin": user.admin,
                "bio": user.bio,
                "id": user.id
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user error: {str(e)}")
        return jsonify({"message": "Invalid token"}), 400

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        response = jsonify({"message": "Logout successful"})
        unset_jwt_cookies(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({"message": "Logout failed"}), 500
