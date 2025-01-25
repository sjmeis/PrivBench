from flask import Blueprint, request, jsonify
from ..utils.email_sender import send_email

email_bp = Blueprint('email', __name__)

@email_bp.route('/send_email', methods=['POST'])
def send_email_endpoint():
    data = request.get_json()

    # Extract email data from the request
    to = data.get('to')
    subject = data.get('subject')
    body = data.get('body')
    redirect_url = data.get('redirect_url')

    if not all([to, subject, body]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        # Call the send_email function
        send_email(to, subject, body, redirect_url)

        return jsonify({'message': 'Email sent successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
