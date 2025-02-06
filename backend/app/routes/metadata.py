from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Submission, SubmissionMetadata, User
from datetime import datetime
from ..extensions import db
from ..enums import License

metadata_bp = Blueprint("metadata", __name__)

@metadata_bp.route("/metadata", methods=["POST"])
@jwt_required()
def save_metadata():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        new_submission = Submission(
            name=data.get("modelName", "Unnamed Submission"),
            submission_date=datetime.utcnow(),
            user_id=user.id,
            status="PENDING",
            score=0,
            is_public=True,
        )
        db.session.add(new_submission)
        db.session.flush()  # Flush to get the submission ID

        license_str = data.get("license")
        try:
            transformed_license = (
                license_str.replace(" ", "_").replace(".", "_").upper()
            )
            license_enum = License[transformed_license]
        except KeyError:
            return jsonify({"message": f"Invalid license type: {license_str}"}), 400


        metadata = SubmissionMetadata(
            submission_id=new_submission.id,
            model_name=data["modelName"],
            model_description=data["modelDescription"],
            license=license_enum,
            tags=data.get("tags"),
            authors=data.get("authors"),
            research_paper_url=data.get("researchPaperUrl"),
            github_url=data.get("githubUrl"),
            bibtex_citation=data.get("bibtexCitation"),
        )
        db.session.add(metadata)
        db.session.commit()

        return jsonify({"message": "Submission and metadata saved successfully",
                        "submission_id": new_submission.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@metadata_bp.route('/metadata', methods=['PUT'])
@jwt_required()
def update_submission_detail():
    try:
        data = request.get_json()
        submission_id = data.get('id')

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = (
            db.session.query(Submission)
            .filter(Submission.id == submission_id)
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        submission.name = data.get('name', submission.name)
        submission.status = data.get('status', submission.status)
        submission.is_public = data.get('isPublic', submission.is_public)
        submission.submission_date = data.get('submissionDate', submission.submission_date)

        metadata_data = data.get('metadata', {})
        if metadata_data:
            submission_metadata = submission.submission_metadata or SubmissionMetadata()
            submission_metadata.model_name = metadata_data.get('modelName', submission_metadata.model_name)
            submission_metadata.model_description = metadata_data.get('modelDescription', submission_metadata.model_description)

            license_str = metadata_data.get('license')
            if license_str:
                try:
                    transformed_license = license_str.replace(" ", "_").replace(".", "_").upper()
                    submission_metadata.license = License[transformed_license]
                except KeyError:
                    return jsonify({"message": f"Invalid license type: {license_str}"}), 400

            submission_metadata.tags = metadata_data.get('tags', submission_metadata.tags)
            submission_metadata.authors = metadata_data.get('authors', submission_metadata.authors)
            submission_metadata.research_paper_url = metadata_data.get('researchPaperUrl', submission_metadata.research_paper_url)
            submission_metadata.github_url = metadata_data.get('githubUrl', submission_metadata.github_url)
            submission_metadata.bibtex_citation = metadata_data.get('bibtexCitation', submission_metadata.bibtex_citation)

            db.session.add(submission_metadata)
            submission.submission_metadata = submission_metadata

        db.session.commit()

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
                "license": submission.submission_metadata.license.name,
                "tags": submission.submission_metadata.tags.split(",") if submission.submission_metadata.tags else [],
                "authors": submission.submission_metadata.authors,
                "researchPaperUrl": submission.submission_metadata.research_paper_url,
                "githubUrl": submission.submission_metadata.github_url,
                "bibtexCitation": submission.submission_metadata.bibtex_citation,
            }

        return jsonify({"submission": updated_submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@metadata_bp.route('/licenses', methods=['GET'])
def get_licenses():
    try:
        licenses = [license.value for license in License]
        return jsonify({"licenses": licenses}), 200
    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500