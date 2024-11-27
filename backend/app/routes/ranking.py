from flask import Blueprint, request, jsonify, make_response, current_app
from ..models import Result, User
from .. import db

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route('/ranking', methods=['GET'])
def ranking():
    results = Result.query.order_by(Result.score.desc()).all()
    results_list = [
        {
            "id": result.id,
            "submission_date": result.submission_date.isoformat(),
            "name": result.name,
            "method": result.method,
            "submitted_by": result.submitted_by,
            "score": result.score
        }
        for result in results
    ]
    return jsonify(results_list)

@ranking_bp.route('/ranking', methods=['POST'])
def get_all_filtered():
    try:
        data = request.get_json()
        search_term = data.get('searchTerm', '')
        page = data.get('page', 1)
        limit = data.get('limit', 8)

        query = db.session.query(Result).join(User).order_by(Result.score.desc())

        if search_term:
            search_term = f"%{search_term}%"
            query = query.filter(
                or_(
                    Result.name.ilike(search_term),
                    Result.method.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )

        offset = (page - 1) * limit
        results = query.offset(offset).limit(limit).all()

        total = query.count()

        results_list = [
            {
                "id": result.id,
                "submissionDate": result.submission_date.isoformat(),
                "name": result.name,
                "method": result.method,
                "submittedBy": {
                    "id": result.submitted_by,
                    "username": result.user.username,
                    "mailAddress": result.user.mail_address,
                    "badges": result.user.badges
                },
                "score": result.score
            }
            for result in results
        ]

        response = {
            "results": results_list,
            "totalPages": (total + limit - 1) // limit,  # Calculate total pages
            "currentPage": page
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

