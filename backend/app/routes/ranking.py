from flask import Blueprint, request, jsonify, make_response, current_app
from ..models import User, Submission, SubmissionMetadata, BenchmarkModule, BenchmarkScore
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
                    "researchInstitute": submission.user.research_institute
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


@ranking_bp.route('/ranking/detail', methods=['POST'])
def get_submission_detail():
    try:
        data = request.get_json()
        submission_id = data.get('id')

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = (
            db.session.query(Submission)
            .filter(Submission.id == submission_id)
            .join(User)
            .join(SubmissionMetadata, isouter=True)
            .join(BenchmarkScore, isouter=True)
            .join(BenchmarkModule, BenchmarkScore.benchmark_module, isouter=True)  # Using relationship to join BenchmarkModule
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        submission_detail = {
            "id": submission.id,
            "name": submission.name,
            "submissionDate": submission.submission_date.isoformat(),
            "status": submission.status.value,
            "isPublic": submission.is_public,
            "overallScore": submission.score,
            "metadata": None,
            "user": {
                "id": submission.user.id,
                "username": submission.user.username,
                "mailAddress": submission.user.mail_address,
                "badges": submission.user.badges or [],
                "researchInstitute": submission.user.research_institute,
            },
            "benchmarkScores": []
        }

        if submission.submission_metadata:
            submission_detail["metadata"] = {
                "modelName": submission.submission_metadata.model_name,
                "modelDescription": submission.submission_metadata.model_description,
                "license": submission.submission_metadata.license,
                "tags": submission.submission_metadata.tags.split(",") if submission.submission_metadata.tags else [],
                "authors": submission.submission_metadata.authors,
                "researchPaperUrl": submission.submission_metadata.research_paper_url,
                "githubUrl": submission.submission_metadata.github_url,
                "bibtexCitation": submission.submission_metadata.bibtex_citation,
            }

        if submission.benchmark_scores:
            submission_detail["benchmarkScores"] = [
                {
                    "id": score.id,
                    "score": score.score,
                    "createdAt": score.created_at.isoformat(),
                    "benchmarkModule": {
                        "id": score.benchmark_module.id,
                        "name": score.benchmark_module.name,
                        "version": score.benchmark_module.version,
                        "isActive": score.benchmark_module.is_active,
                        "createdAt": score.benchmark_module.created_at.isoformat()
                    }
                }
                for score in submission.benchmark_scores
            ]

        return jsonify({"submission": submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500



