from flask import current_app
from flask_mail import Message
from .. import mail

def send_email(to, subject, body, redirect_url=None):
    """
    Sends an email using Flask-Mail.

    :param to: Recipient email address (string or list of strings)
    :param subject: Subject of the email
    :param body: Body text of the email
    :param redirect_url: URL to include in the email for redirection (optional)
    """
    # Create the email message
    message = Message(
        subject=subject,
        recipients=[to] if isinstance(to, str) else to,
        body=f"{body}\n\nGo to Privbench: {redirect_url}" if redirect_url else body,
        sender=current_app.config.get('MAIL_DEFAULT_SENDER')
    )

    # Optionally add an HTML body with a button for redirection
    if redirect_url:
        html_body = f"""
        <p>{body}</p>
        <p style="text-align: center; margin-top: 20px;">
            <a href="{redirect_url}" style="display: inline-block; padding: 10px 20px; 
            font-size: 18px; font-weight: bold; background-color: #007bff; color: #fff; 
            text-decoration: none; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                See more
            </a>
        </p>
        """
        message.html = html_body

    # Send the email
    try:
        with current_app.app_context():
            mail.send(message)
            current_app.logger.info(f"Email sent to {to} with subject: '{subject}'")
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to}: {e}")
        raise
