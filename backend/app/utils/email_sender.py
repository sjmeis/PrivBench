import logging
from flask import current_app
from flask_mail import Message
from .. import mail

logger = logging.getLogger(__name__)

def send_email(to, subject, body, redirect_url=None):
    """
    Sends an email using Flask-Mail.

    :param to: Recipient email address (string or list of strings)
    :param subject: Subject of the email
    :param body: Body text of the email
    :param redirect_url: URL to include in the email for redirection (optional)
    """
    try:
        sender_email = current_app.config.get('MAIL_DEFAULT_SENDER')
    except RuntimeError:
        from app import app
        sender_email = app.config.get('MAIL_DEFAULT_SENDER')


    # Create the email message
    message = Message(
        subject=subject,
        recipients=[to] if isinstance(to, str) else to,
        body=f"{body}\n\nGo to Privbench: {redirect_url}" if redirect_url else body,
        sender=sender_email
    )

    # Optionally add an HTML body with a button for redirection
    if redirect_url:
        html_body = f"""
        <p>{body}</p>
        <p style="text-align: center; margin-top: 20px;">
            <a href="{redirect_url}" style="display: inline-block; padding: 10px 20px; 
            font-size: 18px; font-weight: bold; background-color: #007bff; color: #fff; 
            text-decoration: none; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                See submissions
            </a>
        </p>
        """
        message.html = html_body

    # Send the email
    try:
        # Check if current_app is available; if not, wrap using the raw factory instance
        if current_app:
            mail.send(message)
            current_app.logger.info(f"Email sent to {to} with subject: '{subject}'")
    except RuntimeError:
        from app import app
        with app.app_context():
            mail.send(message)
            logger.info(f"Email sent from Celery process to {to} with subject: '{subject}'")
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        raise

def send_support_email(sender_email, sender_username, subject, body):
    try:
        config = current_app.config
    except RuntimeError:
        from app import app
        config = app.config

    msg = Message(
        subject=f"[PrivBench Support] {subject}",
        sender=config['MAIL_USERNAME'],
        recipients=[config['ADMIN_EMAIL']],
        reply_to=sender_email
    )
    
    msg.body = f"""
    New support request from PrivBench:
    
    User: {sender_username}
    Email: {sender_email}
    Subject: {subject}
    
    Message:
    --------------------------------------------------
    {body}
    --------------------------------------------------
    
    (You can reply directly to this email to reach the user.)
    """
    
    mail.send(msg)
