import os
from celery import shared_task
from ..models import Submission, User, BenchmarkModule
from ..extensions import db
from ..utils.email_sender import send_email
from sqlalchemy import and_
from flask import current_app
from ..config import Config
from datetime import datetime


@shared_task(bind=True)
def mark_submissions_outdated_and_notify(self, module_name):
    """Mark completed submissions as outdated and notify users via email."""
    try:
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

        # Send emails to users
        for user_id, submissions in user_submissions.items(): 
            user = User.query.get(user_id)
            if not user or not user.mail_address:
                continue

            # Create submission list for email
            submission_list = "<br>".join([
                f"- {sub.name} (Current Score: {round(sub.score, 2)})"
                for sub in submissions
            ])

            email_subject = f"Action Required: New Benchmark Module Added - {module_name}"
            frontend_url = Config.FRONTEND_URL  # Get the frontend URL from the config
            email_body = f"""
Dear {user.username},<br><br>

A new benchmark module '{module_name}' has been added to the system.<br>
The following submissions need to be updated:<br><br>

{submission_list}<br><br>

Please visit the platform to update your submissions with the new benchmark module. After 3 days your outdated 
submission will not be visualized on the leaderboard anymore<br><br>

Best regards,<br>
PrivBench Team
"""
            # Send email with redirect_url
            try:
                send_email(
                    to=user.mail_address,
                    subject=email_subject,
                    body=email_body,
                    redirect_url=f"{frontend_url}/profile?state=submissions"  # Pass the redirect URL
                )
            except Exception as e:
                current_app.logger.error(f"Failed to send email to {user.mail_address}: {e}")

        return {
            "status": "success", 
            "message": f"Marked {len(submissions)} submissions as outdated and notified users."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
