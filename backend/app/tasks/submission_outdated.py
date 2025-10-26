from celery import shared_task
from ..models import Submission, User
from ..extensions import db
from ..utils.email_sender import send_email
from flask import current_app
from ..config import Config
from datetime import datetime


@shared_task(bind=True)
def mark_submissions_outdated_and_notify(self, version, changes):
    """
    Mark completed submissions as outdated and notify users via email.
    Triggered only on Publish. 'changes' is a JSON-serializable dict:
      {
        "new_modules": [{"id": int, "name": str}],
        "modified_modules": [{"id": int, "name": str, "description": str}]
      }
    """
    try:
        new_modules = (
            changes.get("new_modules", []) if isinstance(changes, dict) else []
        )
        modified_modules = (
            changes.get("modified_modules", []) if isinstance(changes, dict) else []
        )

        # Get all completed submissions
        submissions = Submission.query.filter_by(status="COMPLETED").all()

        # Group submissions by user
        user_submissions = {}
        for submission in submissions:
            if submission.user_id not in user_submissions:
                user_submissions[submission.user_id] = []
            user_submissions[submission.user_id].append(submission)
            submission.status = "OUTDATED"
            submission.outdated_at = datetime.utcnow()  # Set the outdated timestamp

        db.session.commit()

        # Build change log (HTML)
        new_list_html = (
            "<ul>"
            + "".join(f"<li>{module['name']}</li>" for module in new_modules)
            + "</ul>"
            if new_modules
            else "<i>None</i>"
        )
        mod_list_html = (
            "<ul>"
            + "".join(
                f"<li>{module['name']}"
                + (
                    f": {module.get('description','')}"
                    if module.get("description")
                    else ""
                )
                + "</li>"
                for module in modified_modules
            )
            + "</ul>"
            if modified_modules
            else "<i>None</i>"
        )

        # Send emails to users
        frontend_url = Config.FRONTEND_URL
        for user_id, submissions in user_submissions.items():
            user = User.query.get(user_id)
            if not user or not user.mail_address:
                continue

            # Create submission list for email
            submission_list = "<br>".join(
                f"- {sub.name} (Current Score: {round(sub.score or 0.0, 2)})"
                for sub in submissions
            )

            email_subject = f"PrivBench v{version} published — Action required"
            email_body = f"""
Dear {user.username},<br><br>

A new PrivBench version <b>v{version}</b> has been published.<br>
Your submissions need attention because new benchmark module(s) were added.<br><br>

<b>What changed in v{version}:</b><br>
<b>New modules:</b><br>
{new_list_html}
<b>Modified modules:</b><br>
{mod_list_html}
<br>

<b>Submissions to update:</b><br>
{submission_list}<br><br>

Please visit the platform to update your submissions with the new benchmark module(s).
After 3 days, outdated submissions will not be visualized on the leaderboard anymore.<br><br>

Best regards,<br>
PrivBench Team
"""
            # Send email with redirect_url
            try:
                send_email(
                    to=user.mail_address,
                    subject=email_subject,
                    body=email_body,
                    redirect_url=f"{frontend_url}/profile?state=submissions",  # Pass the redirect URL
                )
            except Exception as e:
                current_app.logger.error(
                    f"Failed to send email to {user.mail_address}: {e}"
                )

        return {
            "status": "success",
            "message": f"Marked {len(submissions)} submissions as outdated and notified users.",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
