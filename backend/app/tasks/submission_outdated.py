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
from datetime import datetime
from ..models import Submission, User, BenchmarkScore
from ..enums import SubmissionStatus
from ..extensions import db
from ..utils.email_sender import send_email
from flask import current_app
from ..config import Config

@shared_task(bind=True)
def mark_submissions_outdated_and_notify(self, version, changes):
    try:
        new_modules = changes.get("new_modules", []) if isinstance(changes, dict) else []
        modified_modules = changes.get("modified_modules", []) if isinstance(changes, dict) else []

        modified_ids = {m["id"] for m in modified_modules}
        has_new_modules = len(new_modules) > 0

        # Query only submissions that need attention
        query = db.session.query(Submission).filter(Submission.status == SubmissionStatus.COMPLETED)

        if not has_new_modules and modified_ids:
            # Only invalidate submissions that actually rely on the modified modules
            query = query.join(BenchmarkScore).filter(BenchmarkScore.module_id.in_(modified_ids)).distinct()

        affected_submissions = query.all()

        user_submissions = {}
        for sub in affected_submissions:
            sub.status = SubmissionStatus.OUTDATED
            sub.outdated_at = datetime.utcnow()
            user_submissions.setdefault(sub.user_id, []).append(sub)

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
