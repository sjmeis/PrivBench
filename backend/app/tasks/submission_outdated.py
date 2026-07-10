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

PrivBench version <b>v{version}</b> has been published and the benchmark suite was updated. 
These changes may affect previously evaluated submissions.<br><br>

<b>What changed in v{version}:</b><br>
<b>New modules:</b><br>
{new_list_html}
<b>Modified modules:</b><br>
{mod_list_html}
<br>

<b>Submissions to review:</b><br>
{submission_list}<br><br>

Please visit the platform to update your submissions with the new benchmark module(s).
After 3 days, outdated submissions will not be visualized on the leaderboard anymore.<br><br>

Best regards,<br>
The PrivBench Team
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
