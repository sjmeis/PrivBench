from flask import Blueprint, request, jsonify, make_response, current_app
from ..models import User, Submission
from .. import db
from ..enums import SubmissionStatus
from sqlalchemy import or_

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route('/ranking', methods=['POST'])
def get_all_filtered():
    try:
        data = request.get_json()
        search_term = data.get('searchTerm', '')
        page = data.get('page', 1)
        limit = data.get('limit', 8)

        # Base query: filter submissions with status=Completed and is_public=True
        query = (
            db.session.query(Submission)
            .join(User)
            .filter(
                Submission.status == SubmissionStatus.COMPLETED,
                Submission.is_public == True  # Ensure submission is public
            )
            .order_by(Submission.score.desc())
        )

        # Apply search filter if provided
        if search_term:
            search_term = f"%{search_term}%"
            query = query.filter(
                or_(
                    Submission.name.ilike(search_term),
                    User.username.ilike(search_term),
                )
            )

        #Pagination
        offset = (page - 1) * limit
        paginated_results = query.offset(offset).limit(limit).all()

        total = query.count()

        results_list = [
            {
                "id": submission.id,
                "name": submission.name,
                "submissionDate": submission.submission_date.isoformat(),
                "status": submission.status.value,
                "isPublic": submission.is_public,
                "overallScore": submission.score,  # You can retain the overall score if required
                "user": {
                    "id": submission.user.id,
                    "username": submission.user.username,
                    "mailAddress": submission.user.mail_address,
                    "badges": submission.user.badges,
                },
            }
            for submission in paginated_results
        ]

        response = {
            "results": results_list,
            "totalPages": (total + limit - 1) // limit,  # Calculate total pages
            "currentPage": page
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500
