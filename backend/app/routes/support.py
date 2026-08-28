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


from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..utils.email_sender import send_support_email
from ..extensions import limiter

support_bp = Blueprint("support", __name__)

@support_bp.route('/support/contact', methods=['POST'])
@jwt_required()
@limiter.limit("5 per hour")
def contact_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    data = request.get_json() or {}
    subject = (data.get('subject') or 'General Support Request').strip()[:200]
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({"message": "Message content is required"}), 400

    if len(message) > 5000:
        return jsonify({"message": "Message exceeds maximum length of 5000 characters"}), 400

    send_support_email(
        sender_email=user.mail_address,
        sender_username=user.username,
        subject=subject,
        body=message
    )

    return jsonify({"message": "Support request sent successfully!"}), 200