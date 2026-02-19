# app/routes/support.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..utils.email_sender import send_support_email # You'll create this

support_bp = Blueprint("support", __name__)

@support_bp.route('/support/contact', methods=['POST'])
@jwt_required()
def contact_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.get_json()
    subject = data.get('subject', 'General Support Request')
    message = data.get('message')

    if not message:
        return jsonify({"message": "Message content is required"}), 400

    # Send email to YOUR email address
    send_support_email(
        sender_email=user.mail_address,
        sender_username=user.username,
        subject=subject,
        body=message
    )

    return jsonify({"message": "Support request sent successfully!"}), 200