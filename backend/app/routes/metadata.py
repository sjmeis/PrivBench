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

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import Submission, SubmissionMetadata, TemplateMetadata, User
from datetime import datetime, timedelta
from ..extensions import db
from ..enums import License

metadata_bp = Blueprint("metadata", __name__)

@metadata_bp.route("/quota-status", methods=["GET"])
@jwt_required()
def get_quota_status():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Calculate the 24-hour rolling window
        limit_window = datetime.utcnow() - timedelta(hours=24)

        # Count existing submissions in that window
        usage_count = Submission.query.filter(
            Submission.user_id == user.id,
            Submission.submission_date >= limit_window
        ).count()

        remaining = max(0, user.daily_submission_limit - usage_count)

        return jsonify({
            "usage": usage_count,
            "limit": user.daily_submission_limit,
            "remaining": remaining,
            "reset_info": "Rolling 24-hour window."
        }), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@metadata_bp.route("/metadata", methods=["POST"])
@jwt_required()
def save_metadata():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        limit_window = datetime.utcnow() - timedelta(hours=24)

        recent_submissions_count = Submission.query.filter(
            Submission.user_id == user.id,
            Submission.submission_date >= limit_window
        ).count()

        if recent_submissions_count >= user.daily_submission_limit:
            return jsonify({
                "message": f"Daily limit reached. Your current limit is {user.daily_submission_limit} submissions per 24 hours.",
                "remaining": 0
            }), 429

        new_submission = Submission(
            name=data.get("modelName", "Unnamed Submission"),
            submission_date=datetime.utcnow(),
            user_id=user.id,
            status="PENDING",
            score=0,
            is_public=False,
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

        remaining = user.daily_submission_limit - (recent_submissions_count + 1)
        return (
            jsonify(
                {
                    "message": "Submission and metadata saved successfully",
                    "submission_id": new_submission.id,
                    "remaining_slots": max(0, remaining)
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500

@metadata_bp.route("/metadata", methods=["PUT"])
@jwt_required()
def update_submission_detail():
    try:
        data = request.get_json()
        submission_id = data.get("id")

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = (
            db.session.query(Submission)
            .filter(Submission.id == submission_id)
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        submission.name = data.get("name", submission.name)
        submission.status = data.get("status", submission.status)
        submission.is_public = data.get("isPublic", submission.is_public)
        submission.submission_date = data.get(
            "submissionDate", submission.submission_date
        )

        metadata_data = data.get("metadata", {})
        if metadata_data:
            submission_metadata = submission.submission_metadata or SubmissionMetadata()
            submission_metadata.model_name = metadata_data.get(
                "modelName", submission_metadata.model_name
            )
            submission_metadata.model_description = metadata_data.get(
                "modelDescription", submission_metadata.model_description
            )

            license_str = metadata_data.get("license")
            if license_str:
                try:
                    transformed_license = (
                        license_str.replace(" ", "_").replace(".", "_").upper()
                    )
                    submission_metadata.license = License[transformed_license]
                except KeyError:
                    return (
                        jsonify({"message": f"Invalid license type: {license_str}"}),
                        400,
                    )

            submission_metadata.tags = metadata_data.get(
                "tags", submission_metadata.tags
            )
            submission_metadata.authors = metadata_data.get(
                "authors", submission_metadata.authors
            )
            submission_metadata.research_paper_url = metadata_data.get(
                "researchPaperUrl", submission_metadata.research_paper_url
            )
            submission_metadata.github_url = metadata_data.get(
                "githubUrl", submission_metadata.github_url
            )
            submission_metadata.bibtex_citation = metadata_data.get(
                "bibtexCitation", submission_metadata.bibtex_citation
            )

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
            "benchmarkScores": [],
        }

        if submission.submission_metadata:
            updated_submission_detail["metadata"] = {
                "modelName": submission.submission_metadata.model_name,
                "modelDescription": submission.submission_metadata.model_description,
                "license": submission.submission_metadata.license.name,
                "tags": (
                    submission.submission_metadata.tags.split(",")
                    if submission.submission_metadata.tags
                    else []
                ),
                "authors": submission.submission_metadata.authors,
                "researchPaperUrl": submission.submission_metadata.research_paper_url,
                "githubUrl": submission.submission_metadata.github_url,
                "bibtexCitation": submission.submission_metadata.bibtex_citation,
            }

        return jsonify({"submission": updated_submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@metadata_bp.route("/metadata/templates", methods=["POST"])
@jwt_required()
def save_template_metadata():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        template_name = data.get("templateName")
        if not template_name:
            return jsonify({"message": "Template name is required"}), 400

        # Check if a template with the same name already exists for this user
        existing_template = TemplateMetadata.query.filter_by(
            user_id=user_id, template_name=template_name
        ).first()
        if existing_template:
            return (
                jsonify({"message": "A template with this name already exists."}),
                409,  # HTTP 409 Conflict
            )

        license_str = data.get("license")
        try:
            transformed_license = (
                license_str.replace(" ", "_").replace(".", "_").upper()
            )
            license_enum = License[transformed_license]
        except KeyError:
            return jsonify({"message": f"Invalid license type: {license_str}"}), 400

        template_metadata = TemplateMetadata(
            user_id=user_id,
            template_name=template_name,
            model_name=data["modelName"],
            model_description=data["modelDescription"],
            license=license_enum,
            tags=data.get("tags"),
            authors=data.get("authors"),
            research_paper_url=data.get("researchPaperUrl"),
            github_url=data.get("githubUrl"),
            bibtex_citation=data.get("bibtexCitation"),
        )

        db.session.add(template_metadata)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Template metadata saved successfully",
                    "template_id": template_metadata.id,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@metadata_bp.route("/metadata/templates/<int:template_id>", methods=["PUT"])
@jwt_required()
def update_template(template_id):
    try:
        user_id = get_jwt_identity()
        template = TemplateMetadata.query.filter_by(
            id=template_id, user_id=user_id
        ).first()

        if not template:
            return jsonify({"message": "Template not found or access denied"}), 404

        data = request.get_json()

        # Check for name conflict if template name is being changed
        new_template_name = data.get("templateName")
        if new_template_name and new_template_name != template.template_name:
            existing = TemplateMetadata.query.filter_by(
                user_id=user_id, template_name=new_template_name
            ).first()
            if existing:
                return (
                    jsonify({"message": "A template with this name already exists."}),
                    409,
                )

        license_str = data.get("license")
        try:
            transformed_license = (
                license_str.replace(" ", "_").replace(".", "_").upper()
            )
            license_enum = License[transformed_license]
        except KeyError:
            return jsonify({"message": f"Invalid license type: {license_str}"}), 400

        template.template_name = new_template_name or template.template_name
        template.model_name = data["modelName"]
        template.model_description = data["modelDescription"]
        template.license = license_enum
        template.tags = data.get("tags")
        template.authors = data.get("authors")
        template.research_paper_url = data.get("researchPaperUrl")
        template.github_url = data.get("githubUrl")
        template.bibtex_citation = data.get("bibtexCitation")

        db.session.commit()
        return jsonify({"message": "Template updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@metadata_bp.route("/metadata/templates/<int:template_id>", methods=["DELETE"])
@jwt_required()
def delete_template(template_id):
    try:
        user_id = get_jwt_identity()
        template = TemplateMetadata.query.filter_by(
            id=template_id, user_id=user_id
        ).first()

        if not template:
            return jsonify({"message": "Template not found or access denied"}), 404

        db.session.delete(template)
        db.session.commit()
        return jsonify({"message": "Template deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@metadata_bp.route("/metadata/templates", methods=["GET"])
@jwt_required()
def get_templates():
    try:
        user_id = get_jwt_identity()
        templates = TemplateMetadata.query.filter_by(user_id=user_id).all()
        templates_data = [
            {
                "id": template.id,
                "templateName": template.template_name,
                "modelName": template.model_name,
                "modelDescription": template.model_description,
                "license": template.license.value,
                "tags": template.tags,
                "authors": template.authors,
                "researchPaperUrl": template.research_paper_url,
                "githubUrl": template.github_url,
                "bibtexCitation": template.bibtex_citation,
            }
            for template in templates
        ]
        return jsonify(templates_data)
    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@metadata_bp.route("/licenses", methods=["GET"])
def get_licenses():
    try:
        licenses = [license.value for license in License]
        return jsonify({"licenses": licenses}), 200
    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500
