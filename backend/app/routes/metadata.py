from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Submission, SubmissionMetadata, User
from datetime import datetime
from ..extensions import db

metadata_bp = Blueprint("metadata", __name__)

@metadata_bp.route("/metadata", methods=["POST"])
@jwt_required()
def save_metadata():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Validate user
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Create a new submission
        new_submission = Submission(
            name=data.get("modelName", "Unnamed Submission"),
            submission_date=datetime.utcnow(),
            user_id=user.id,
            status="PENDING",  # Assuming initial status is PENDING
            score=0,
            is_public=True,  # Adjust based on requirements
        )
        db.session.add(new_submission)
        db.session.flush()  # Flush to get the submission ID

        # Create metadata
        metadata = SubmissionMetadata(
            submission_id=new_submission.id,
            model_name=data["modelName"],
            model_description=data["modelDescription"],
            license=data["license"],
            tags=data.get("tags"),
            authors=data.get("authors"),
            research_paper_url=data.get("relatedResearchPaper"),
            github_url=data.get("relatedGithubRepo"),
            bibtex_citation=data.get("bibtexCitation"),
        )
        db.session.add(metadata)
        db.session.commit()

        return jsonify({"message": "Submission and metadata saved successfully", 
                        "submission_id": new_submission.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500
