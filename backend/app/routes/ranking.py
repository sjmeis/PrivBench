from flask import Blueprint, request, jsonify, make_response, current_app
from ..models import User, Submission, SubmissionMetadata, BenchmarkModule, BenchmarkScore
from .. import db
from ..enums import SubmissionStatus
from sqlalchemy import or_, and_
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required,
)
from datetime import datetime, timedelta

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route('/ranking/user/count', methods=['GET'])
@jwt_required()
def count_user_submissions():
    try:
        current_user_id = get_jwt_identity()

        submission_count = db.session.query(Submission).filter_by(user_id=current_user_id).count()

        return jsonify({"submissionCount": submission_count}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@ranking_bp.route('/ranking/update', methods=['POST'])
@jwt_required()
def make_submission_public():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        submission_id = data.get('id')
        is_public = data.get('isPublic')

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = db.session.query(Submission).filter_by(id=submission_id, user_id=current_user_id).first()

        if not submission:
            return jsonify({"message": "Submission not found or access denied"}), 404

        if submission.status != SubmissionStatus.COMPLETED:
            return jsonify({"message": "Submission must be completed to make it public"}), 400

        submission.is_public = is_public;
        db.session.commit()

        return jsonify({"message": "Submission made public successfully", "submissionId": submission_id}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route('/ranking/user', methods=['GET'])
@jwt_required()
def get_user_submissions():
    try:
        current_user_id = get_jwt_identity()

        submissions = (
            db.session.query(Submission)
            .filter(Submission.user_id == current_user_id)
            .join(User)
            .join(SubmissionMetadata, isouter=True)
            .join(BenchmarkScore, isouter=True)
            .join(BenchmarkModule, BenchmarkScore.benchmark_module, isouter=True)
            .order_by(Submission.submission_date.desc())
            .all()
        )

        submissions_data = []
        for submission in submissions:
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
                    "tags": submission.submission_metadata.tags,
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
                            "title": score.benchmark_module.title,
                            "version": score.benchmark_module.version,
                            "isActive": score.benchmark_module.is_active,
                            "createdAt": score.benchmark_module.created_at.isoformat(),
                        }
                    }
                    for score in submission.benchmark_scores
                ]

            submissions_data.append(submission_detail)

        return jsonify({"submissions": submissions_data}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500





@ranking_bp.route('/ranking', methods=['POST'])
def get_all_filtered():
    try:
        data = request.get_json()
        search_term = data.get('searchTerm', '').strip()
        page = data.get('page', 1)
        limit = data.get('limit', 8)
        sort_by = data.get('sortBy', 'score')
        sort_order = data.get('sortOrder', 'desc')

        # Base query
        query = (
            db.session.query(Submission)
            .join(User)
            .filter(
                or_(
                    and_(
                        Submission.status == SubmissionStatus.COMPLETED,
                        Submission.is_public == True  # Ensure submission is public
                    ),
                    and_(
                        Submission.status == SubmissionStatus.OUTDATED,
                        Submission.outdated_at >= datetime.utcnow() - timedelta(days=3)  # Check if outdated within last 3 days
                    )
                )
            )
        )

        #Search filter
        if search_term:
            search_term = f"%{search_term}%"
            query = query.filter(
                or_(
                    Submission.name.ilike(search_term),
                    User.username.ilike(search_term),
                )
            )

        #Sorting
        sort_column_map = {
            "score": Submission.score,
            "name": Submission.name,
            "submissionDate": Submission.submission_date,
            "username": User.username
        }

        sort_column = sort_column_map.get(sort_by, Submission.score)  # Default to score
        if sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Pagination
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
                "overallScore": submission.score,
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
            "totalEntries": total,
            "totalPages": (total + limit - 1) // limit,
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
                        "title": score.benchmark_module.title,
                        "version": score.benchmark_module.version,
                        "description": score.benchmark_module.description,
                        "isActive": score.benchmark_module.is_active,
                        "createdAt": score.benchmark_module.created_at.isoformat()
                    }
                }
                for score in submission.benchmark_scores
            ]

        return jsonify({"submission": submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@ranking_bp.route('/ranking/detail', methods=['PUT'])
def update_submission_detail():
    try:
        data = request.get_json()
        submission_id = data.get('id')

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        # Fetch the existing submission to update
        submission = (
            db.session.query(Submission)
            .filter(Submission.id == submission_id)
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        # Update the submission fields from the request data
        submission.name = data.get('name', submission.name)
        submission.status = data.get('status', submission.status)
        submission.is_public = data.get('isPublic', submission.is_public)
        submission.submission_date = data.get('submissionDate', submission.submission_date)

        # Assuming the submission metadata might be updated, handle that if present
        metadata_data = data.get('metadata', {})
        if metadata_data:
            # Assuming submission_metadata relationship exists in the model
            submission_metadata = submission.submission_metadata or SubmissionMetadata()
            submission_metadata.model_name = metadata_data.get('modelName', submission_metadata.model_name)
            submission_metadata.model_description = metadata_data.get('modelDescription', submission_metadata.model_description)
            submission_metadata.license = metadata_data.get('license', submission_metadata.license)
            submission_metadata.tags = ",".join(metadata_data.get('tags', [])) if metadata_data.get('tags') else submission_metadata.tags
            submission_metadata.authors = metadata_data.get('authors', submission_metadata.authors)
            submission_metadata.research_paper_url = metadata_data.get('researchPaperUrl', submission_metadata.research_paper_url)
            submission_metadata.github_url = metadata_data.get('githubUrl', submission_metadata.github_url)
            submission_metadata.bibtex_citation = metadata_data.get('bibtexCitation', submission_metadata.bibtex_citation)

            # Save or update the submission metadata
            db.session.add(submission_metadata)
            submission.submission_metadata = submission_metadata

        # Commit the changes to the database
        db.session.commit()

        # Prepare the response with the updated submission details
        updated_submission_detail = {
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
            updated_submission_detail["metadata"] = {
                "modelName": submission.submission_metadata.model_name,
                "modelDescription": submission.submission_metadata.model_description,
                "license": submission.submission_metadata.license,
                "tags": submission.submission_metadata.tags.split(",") if submission.submission_metadata.tags else [],
                "authors": submission.submission_metadata.authors,
                "researchPaperUrl": submission.submission_metadata.research_paper_url,
                "githubUrl": submission.submission_metadata.github_url,
                "bibtexCitation": submission.submission_metadata.bibtex_citation,
            }

        # Return the updated submission details
        return jsonify({"submission": updated_submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500
    



    

