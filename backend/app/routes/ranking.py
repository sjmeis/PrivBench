from flask import Blueprint, request, jsonify
from ..models import (
    User,
    Submission,
    SubmissionMetadata,
    BenchmarkModule,
    BenchmarkScore,
    SubmissionVersionScore,
)
from .. import db
from ..enums import SubmissionStatus, License
from ..utils.version_utils import parse_version
from sqlalchemy import or_, and_, distinct
from sqlalchemy.orm import joinedload
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required,
    get_jwt
)
from datetime import datetime, timedelta

ranking_bp = Blueprint("ranking", __name__)


# Endpoint to get available versions and modules for filtering
@ranking_bp.route("/ranking/filters", methods=["GET"])
def get_ranking_filters():
    """Get available versions and modules for filtering"""
    try:
        version_filter = request.args.get("version")
        # Get all unique versions from submissions
        versions = (
            db.session.query(distinct(Submission.version))
            .filter(
                or_(
                    and_(
                        Submission.status == SubmissionStatus.COMPLETED,
                        Submission.is_public == True,
                    ),
                    and_(
                        Submission.status == SubmissionStatus.OUTDATED,
                        Submission.outdated_at >= datetime.utcnow() - timedelta(days=3),
                    ),
                )
            )
            .order_by(Submission.version.desc())
            .all()
        )

        # Get all unique versions from version_scores as well
        version_scores_versions = (
            db.session.query(distinct(SubmissionVersionScore.version))
            .join(Submission)
            .filter(
                or_(
                    and_(
                        Submission.status == SubmissionStatus.COMPLETED,
                        Submission.is_public == True,
                    ),
                    and_(
                        Submission.status == SubmissionStatus.OUTDATED,
                        Submission.outdated_at >= datetime.utcnow() - timedelta(days=3),
                    ),
                )
            )
            .all()
        )

        # Combine and deduplicate versions
        all_versions = set()
        for version in versions:
            if version[0]:
                all_versions.add(version[0])
        for version in version_scores_versions:
            if version[0]:
                all_versions.add(version[0])

        # Filter to only significant versions (x.y.0 where patch = 0)
        significant_versions = []
        for version in all_versions:
            parsed = parse_version(version)
            if parsed and parsed[2] == 0:
                significant_versions.append(version)

        # Modules query based on version filter
        if version_filter:
            print(f"DEBUG: Getting modules for version: {version_filter}")

            # Only get modules from submission_version_score table for this specific version
            modules = (
                db.session.query(BenchmarkModule)
                .join(SubmissionVersionScore.modules)
                .join(Submission, SubmissionVersionScore.submission_id == Submission.id)
                .filter(
                    SubmissionVersionScore.version == version_filter,
                    BenchmarkModule.is_active == True,
                    or_(
                        and_(
                            Submission.status == SubmissionStatus.COMPLETED,
                            Submission.is_public == True,
                        ),
                        and_(
                            Submission.status == SubmissionStatus.OUTDATED,
                            Submission.outdated_at
                            >= datetime.utcnow() - timedelta(days=3),
                        ),
                    ),
                )
                .distinct()
                .order_by(BenchmarkModule.name)
                .all()
            )

            print(f"DEBUG: Found {len(modules)} modules for version {version_filter}")
        else:
            # Get all active benchmark modules if no version filter
            modules = (
                db.session.query(BenchmarkModule)
                .filter(BenchmarkModule.is_active == True)
                .order_by(BenchmarkModule.name)
                .all()
            )

        for module in modules:
            print(
                f"DEBUG: Module ID: {module.id}, Name: {module.name}, Version: {module.version}"
            )

        return (
            jsonify(
                {
                    "versions": sorted(list(all_versions), reverse=True),
                    "modules": [
                        {
                            "id": module.id,
                            "name": module.name,
                            "title": module.title,
                            "version": module.version,
                        }
                        for module in modules
                    ],
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking/user/count", methods=["GET"])
@jwt_required()
def count_user_submissions():
    try:
        current_user_id = get_jwt_identity()

        submission_count = (
            db.session.query(Submission).filter_by(user_id=current_user_id).count()
        )

        return jsonify({"submissionCount": submission_count}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking/update", methods=["POST"])
@jwt_required()
def make_submission_public():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        submission_id = data.get("id")
        is_public = data.get("isPublic")

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = (
            db.session.query(Submission)
            .filter_by(id=submission_id, user_id=current_user_id)
            .first()
        )

        if not submission:
            return jsonify({"message": "Submission not found or access denied"}), 404

        if submission.status != SubmissionStatus.COMPLETED:
            return (
                jsonify({"message": "Submission must be completed to make it public"}),
                400,
            )

        submission.is_public = is_public
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Submission made public successfully",
                    "submissionId": submission_id,
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking/user", methods=["GET"])
@jwt_required()
def get_user_submissions():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        limit_window = datetime.utcnow() - timedelta(hours=24)
        count = Submission.query.filter(
            Submission.user_id == current_user_id, 
            Submission.submission_date >= limit_window
        ).count()
        
        remaining = max(0, user.daily_submission_limit - count)

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
                "version": submission.version,
                "metadata": None,
                "user": {
                    "id": submission.user.id,
                    "username": submission.user.username,
                    "mailAddress": submission.user.mail_address,
                    "badges": submission.user.badges or [],
                    "researchInstitute": submission.user.research_institute,
                    "profilePicturePath": submission.user.profile_picture_path,
                    "bio": submission.user.bio
                },
                "benchmarkScores": [],
            }

            if submission.submission_metadata:
                submission_detail["metadata"] = {
                    "modelName": submission.submission_metadata.model_name,
                    "modelDescription": submission.submission_metadata.model_description,
                    "license": str(submission.submission_metadata.license),
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
                        },
                    }
                    for score in submission.benchmark_scores
                ]

            version_scores_list = []

            # Process submission_version_scores if they exist
            if submission.version_scores:
                for version_score in submission.version_scores:
                    # Filter to only significant versions (x.y.0)
                    parsed = parse_version(version_score.version)
                    if not parsed or parsed[2] != 0:
                        continue

                    # Get modules for this version and find their scores
                    version_modules = []
                    for module in version_score.modules:
                        # Find the corresponding score from benchmark_scores for this module
                        matching_score = None
                        for score in submission.benchmark_scores:
                            if score.benchmark_module.id == module.id:
                                matching_score = score
                                break

                        if matching_score:
                            version_modules.append(
                                {
                                    "benchmarkModule": {
                                        "id": module.id,
                                        "name": module.name,
                                        "title": module.title,
                                        "version": module.version,
                                        "isActive": module.is_active,
                                        "createdAt": module.created_at.isoformat(),
                                    },
                                    "score": matching_score.score,
                                    "createdAt": matching_score.created_at.isoformat(),
                                }
                            )

                    version_scores_list.append(
                        {
                            "version": version_score.version,
                            "score": version_score.score,
                            "created_at": version_score.created_at.isoformat(),
                            "modules": version_modules,
                        }
                    )

            # If no significant version_scores exist, check if current version is significant
            if not version_scores_list:
                parsed = parse_version(submission.version)
                if parsed and parsed[2] == 0:
                    version_scores_list.append(
                        {
                            "version": submission.version,
                            "score": submission.score,
                            "created_at": submission.submission_date.isoformat(),
                            "modules": [
                                {
                                    "benchmarkModule": {
                                        "id": score.benchmark_module.id,
                                        "name": score.benchmark_module.name,
                                        "title": score.benchmark_module.title,
                                        "version": score.benchmark_module.version,
                                        "isActive": score.benchmark_module.is_active,
                                        "createdAt": score.benchmark_module.created_at.isoformat(),
                                    },
                                    "score": score.score,
                                    "createdAt": score.created_at.isoformat(),
                                }
                                for score in submission.benchmark_scores
                            ],
                        }
                    )

            # Sort by version
            submission_detail["version_scores"] = sorted(
                version_scores_list, key=lambda x: x["version"], reverse=True
            )

            submissions_data.append(submission_detail)

        return jsonify({"submissions": submissions_data, "remaining": remaining, "limit": user.daily_submission_limit}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking", methods=["POST"])
def get_all_filtered():
    try:
        data = request.get_json()
        search_term = data.get("searchTerm", "").strip()
        page = data.get("page", 1)
        limit = data.get("limit", 8)
        sort_by = data.get("sortBy", "score")
        sort_order = data.get("sortOrder", "desc")
        version_filter = data.get("version", None)
        module_ids = data.get("moduleIds", [])  # List of module IDs to filter by
        module_weights = data.get("moduleWeights", {})

        # Base query
        query = (
            # db.session.query(Submission)
            # .join(User)
            db.session.query(Submission)
            .options(joinedload(Submission.user), joinedload(Submission.version_scores), joinedload(Submission.benchmark_scores).joinedload(BenchmarkScore.benchmark_module))
            .filter(
                or_(
                    and_(
                        Submission.status == SubmissionStatus.COMPLETED,
                        Submission.is_public == True,  # Ensure submission is public
                    ),
                    and_(
                        Submission.status == SubmissionStatus.OUTDATED,
                        Submission.outdated_at
                        >= datetime.utcnow()
                        - timedelta(days=3),  # Check if outdated within last 3 days
                    ),
                )
            )
        )

        # Version filtering
        if version_filter:
            # Filter by submissions that have this version either as current version or in version_scores
            version_condition = or_(
                Submission.version == version_filter,
                Submission.version_scores.any(
                    SubmissionVersionScore.version == version_filter
                ),
            )
            query = query.filter(version_condition)

        # Module filtering
        if module_ids and len(module_ids) > 0:
            # Convert to integers if they're strings
            module_ids = [int(mid) for mid in module_ids]
            print(f"Filtering by module IDs: {module_ids}")  # Debug log

            # Filter submissions that have scores for all specified modules
            submission_ids_with_modules = (
                db.session.query(BenchmarkScore.submission_id)
                .filter(BenchmarkScore.module_id.in_(module_ids))
                .group_by(BenchmarkScore.submission_id)
                .having(
                    db.func.count(db.distinct(BenchmarkScore.module_id))
                    == len(module_ids)
                )
                .subquery()
            )

            query = query.filter(Submission.id.in_(submission_ids_with_modules))

        # Search filter
        if search_term:
            search_term = f"%{search_term}%"
            query = query.filter(
                or_(
                    Submission.name.ilike(search_term),
                    User.username.ilike(search_term),
                    User.research_institute.ilike(search_term)
                )
            )

        # Get all results before sorting (we need to calculate weighted scores)
        all_submissions = query.all()

        # Calculate weighted scores if weights are provided
        submissions_with_scores = []
        for submission in all_submissions:
            display_version = version_filter or submission.version
            display_score = submission.score

            # If filtering by a specific version that's not the current version
            if version_filter and version_filter != submission.version:
                version_score = next(
                    (
                        vs
                        for vs in submission.version_scores
                        if vs.version == version_filter
                    ),
                    None,
                )
                if version_score:
                    display_score = version_score.score

            # Get module-specific scores
            module_scores = []
            if module_ids and len(module_ids) > 0:
                filtered_scores = (
                    db.session.query(BenchmarkScore)
                    .join(BenchmarkModule)
                    .filter(
                        BenchmarkScore.submission_id == submission.id,
                        BenchmarkScore.module_id.in_(module_ids),
                    )
                    .all()
                )

                module_scores = [
                    {
                        "moduleId": score.module_id,
                        "moduleName": score.benchmark_module.name,
                        "moduleVersion": score.benchmark_module.version,
                        "score": score.score,
                    }
                    for score in filtered_scores
                ]

                # Calculate weighted score if weights are provided
                if module_weights and module_scores:
                    total_weighted_score = 0
                    total_weight = 0

                    for module_score in module_scores:
                        module_id = str(module_score["moduleId"])
                        weight = module_weights.get(
                            module_id, 1.0
                        )  # Default weight of 1.0
                        total_weighted_score += module_score["score"] * weight
                        total_weight += weight

                    if total_weight > 0:
                        display_score = total_weighted_score / total_weight
                        print(
                            f"Calculated weighted score for submission {submission.id}: {display_score}"
                        )
                elif module_scores:
                    # Calculate simple average if no weights provided
                    display_score = sum(ms["score"] for ms in module_scores) / len(
                        module_scores
                    )
            else:
                # When not filtering by modules, show ALL module scores
                all_scores = (
                    db.session.query(BenchmarkScore)
                    .join(BenchmarkModule)
                    .filter(BenchmarkScore.submission_id == submission.id)
                    .all()
                )

                module_scores = [
                    {
                        "moduleId": score.module_id,
                        "moduleName": score.benchmark_module.name,
                        "moduleVersion": score.benchmark_module.version,
                        "score": score.score,
                    }
                    for score in all_scores
                ]

            submission_data = {
                "id": submission.id,
                "name": submission.name,
                "submissionDate": submission.submission_date.isoformat(),
                "status": submission.status.value,
                "isPublic": submission.is_public,
                "overallScore": display_score,
                "version": display_version,
                "moduleScores": module_scores,
                "user": {
                    "id": submission.user.id,
                    "username": submission.user.username,
                    "mailAddress": submission.user.mail_address,
                    "badges": submission.user.badges,
                    "researchInstitute": submission.user.research_institute,
                },
            }

            submissions_with_scores.append(submission_data)

        # Sort by the calculated scores
        sort_key_map = {
            "score": lambda x: x["overallScore"],
            "name": lambda x: x["name"],
            "submissionDate": lambda x: x["submissionDate"],
            "username": lambda x: x["user"]["username"],
        }

        sort_key = sort_key_map.get(sort_by, lambda x: x["overallScore"])
        reverse_order = sort_order == "desc"

        sorted_submissions = sorted(
            submissions_with_scores, key=sort_key, reverse=reverse_order
        )

        total = len(sorted_submissions)

        # Pagination
        offset = (page - 1) * limit
        paginated_results = sorted_submissions[offset : offset + limit]
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        response = {
            "results": paginated_results,
            "totalEntries": total,
            #"totalPages": (total + limit - 1) // limit,
            "totalPages": total_pages,
            "currentPage": page,
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking/detail", methods=["POST"])
@jwt_required(optional=True)
def get_submission_detail():
    try:
        data = request.get_json()
        submission_id = data.get("id")

        module_weights = data.get("moduleWeights", {})

        if module_weights:
            total_w = sum(module_weights.values())
            if not (0.99 <= total_w <= 1.01):
                return jsonify({"message": "Weights must sum to 100%"}), 400

        if not submission_id:
            return jsonify({"message": "Submission ID is required"}), 400

        submission = (
            db.session.query(Submission)
            .filter(Submission.id == submission_id)
            .join(User)
            .join(SubmissionMetadata, isouter=True)
            .join(BenchmarkScore, isouter=True)
            .join(
                BenchmarkModule, BenchmarkScore.benchmark_module, isouter=True
            )  # Using relationship to join BenchmarkModule
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404
        
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        # if not public, you must be the owner OR an admin
        if not submission.is_public:
            if not current_user_id or (current_user_id != submission.user_id and not is_admin):
                return jsonify({"message": "This submission is private."}), 403

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
            "benchmarkScores": [],
        }

        if submission.submission_metadata:
            submission_detail["metadata"] = {
                "modelName": submission.submission_metadata.model_name,
                "modelDescription": submission.submission_metadata.model_description,
                "license": str(submission.submission_metadata.license),
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
                        "createdAt": score.benchmark_module.created_at.isoformat(),
                    },
                }
                for score in submission.benchmark_scores
            ]

        return jsonify({"submission": submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500


@ranking_bp.route("/ranking/detail", methods=["PUT"])
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
            license_name = metadata_data.get("license")
            if license_name:
                submission_metadata.license = License[license_name]
            submission_metadata.tags = (
                ",".join(metadata_data.get("tags", []))
                if metadata_data.get("tags")
                else submission_metadata.tags
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
