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
from ..utils.email_sender import send_email

email_bp = Blueprint('email', __name__)

@email_bp.route('/send_email', methods=['POST'])
def send_email_endpoint():
    data = request.get_json()

    to = data.get('to')
    subject = data.get('subject')
    body = data.get('body')
    redirect_url = data.get('redirect_url')

    if not all([to, subject, body]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        send_email(to, subject, body, redirect_url)

        return jsonify({'message': 'Email sent successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
