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

    send_support_email(
        sender_email=user.mail_address,
        sender_username=user.username,
        subject=subject,
        body=message
    )

    return jsonify({"message": "Support request sent successfully!"}), 200