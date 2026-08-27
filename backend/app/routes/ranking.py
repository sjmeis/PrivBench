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
from ..models import (
    User,
    Submission,
    SubmissionMetadata,
    BenchmarkModule,
    BenchmarkScore,
    SubmissionVersionScore,
    AppVersion
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
            target_release = AppVersion.query.filter_by(version=version_filter).first()
            if target_release and target_release.blueprint:
                module_ids = [item["module_id"] for item in target_release.blueprint]
                modules = (
                    db.session.query(BenchmarkModule)
                    .filter(BenchmarkModule.id.in_(module_ids))
                    .order_by(BenchmarkModule.name)
                    .all()
                )
            else:
                modules = (
                    db.session.query(BenchmarkModule)
                    .filter(BenchmarkModule.is_active == True, BenchmarkModule.is_deleted == False)
                    .order_by(BenchmarkModule.name)
                    .all()
                )
        else:
            modules = (
                db.session.query(BenchmarkModule)
                .filter(BenchmarkModule.is_active == True, BenchmarkModule.is_deleted == False)
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
            .options(
                joinedload(Submission.user),
                joinedload(Submission.submission_metadata),
                joinedload(Submission.version_scores).joinedload(SubmissionVersionScore.modules),
                joinedload(Submission.benchmark_scores).joinedload(BenchmarkScore.benchmark_module)
            )
            .order_by(Submission.submission_date.desc())
            .all()
        )

        submissions_data = []
        for submission in submissions:
            # Score lookup by module_id
            score_map = {
                bs.module_id: {
                    "score": bs.score,
                    "created_at": bs.created_at.isoformat() if bs.created_at else None,
                    "module": bs.benchmark_module
                }
                for bs in submission.benchmark_scores
                if bs.benchmark_module is not None
            }

            version_scores_list = []
            if submission.version_scores:
                for version_score in submission.version_scores:
                    version_modules = []
                    for module in version_score.modules:
                        entry = score_map.get(module.id)
                        version_modules.append({
                            "id": module.id,
                            "module_id": module.id,
                            "name": module.name,
                            "title": module.title,
                            "version": module.version,
                            "score": entry["score"] if entry else None,
                            "createdAt": entry["created_at"] if entry else None,
                            "benchmarkModule": {
                                "id": module.id,
                                "name": module.name,
                                "title": module.title,
                                "version": module.version,
                                "isActive": module.is_active,
                                "createdAt": module.created_at.isoformat() if module.created_at else None,
                            }
                        })

                    version_scores_list.append({
                        "version": version_score.version,
                        "score": version_score.score,
                        "created_at": version_score.created_at.isoformat() if version_score.created_at else None,
                        "modules": version_modules,
                    })

            # Fallback if no version snapshots exist yet
            if not version_scores_list:
                all_current_modules = []
                for bs in submission.benchmark_scores:
                    if not bs.benchmark_module:
                        continue
                    all_current_modules.append({
                        "id": bs.benchmark_module.id,
                        "module_id": bs.benchmark_module.id,
                        "name": bs.benchmark_module.name,
                        "title": bs.benchmark_module.title,
                        "score": bs.score,
                        "createdAt": bs.created_at.isoformat() if bs.created_at else None,
                        "benchmarkModule": {
                            "id": bs.benchmark_module.id,
                            "name": bs.benchmark_module.name,
                            "title": bs.benchmark_module.title,
                            "version": bs.benchmark_module.version,
                            "isActive": bs.benchmark_module.is_active,
                            "createdAt": bs.benchmark_module.created_at.isoformat() if bs.benchmark_module.created_at else None,
                        }
                    })

                version_scores_list.append({
                    "version": submission.version,
                    "score": submission.score,
                    "created_at": submission.submission_date.isoformat(),
                    "modules": all_current_modules,
                })

            # Sort version list descending (e.g. 1.1.0 before 1.0.0)
            sorted_version_scores = sorted(
                version_scores_list, key=lambda x: x["version"], reverse=True
            )

            submission_detail = {
                "id": submission.id,
                "name": submission.name,
                "submissionDate": submission.submission_date.isoformat(),
                "status": submission.status.value,
                "isPublic": submission.is_public,
                "overallScore": submission.score,
                "score": submission.score,
                "version": submission.version,
                "metadata": {
                    "modelName": submission.submission_metadata.model_name,
                    "modelDescription": submission.submission_metadata.model_description,
                    "license": str(submission.submission_metadata.license),
                    "tags": submission.submission_metadata.tags,
                    "authors": submission.submission_metadata.authors,
                    "researchPaperUrl": submission.submission_metadata.research_paper_url,
                    "githubUrl": submission.submission_metadata.github_url,
                    "bibtexCitation": submission.submission_metadata.bibtex_citation,
                } if submission.submission_metadata else None,
                "user": {
                    "id": submission.user.id,
                    "username": submission.user.username,
                    "mailAddress": submission.user.mail_address,
                    "badges": submission.user.badges or [],
                    "researchInstitute": submission.user.research_institute,
                    "profilePicturePath": submission.user.profile_picture_path,
                    "bio": submission.user.bio
                },
                "version_scores": sorted_version_scores,
                "benchmarkScores": [
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
                    if score.benchmark_module is not None
                ],
            }

            submissions_data.append(submission_detail)

        return jsonify({
            "submissions": submissions_data, 
            "remaining": remaining, 
            "limit": user.daily_submission_limit
        }), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@ranking_bp.route("/ranking", methods=["POST"])
def get_all_filtered():
    try:
        data = request.get_json() or {}
        search_term = data.get("searchTerm", "").strip()
        page = data.get("page", 1)
        limit = data.get("limit", 8)
        sort_by = data.get("sortBy", "score")
        sort_order = data.get("sortOrder", "desc")
        version_filter = data.get("version", None)
        module_ids = data.get("moduleIds", [])
        module_weights = data.get("moduleWeights", {})

        # Base query for public submissions
        query = (
            db.session.query(Submission).join(User)
            .options(
                joinedload(Submission.user),
                joinedload(Submission.version_scores).joinedload(SubmissionVersionScore.modules),
                joinedload(Submission.benchmark_scores).joinedload(BenchmarkScore.benchmark_module)
            )
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
        )

        # 1. Version filtering (match current version OR historical snapshot)
        if version_filter:
            query = query.filter(
                or_(
                    Submission.version == version_filter,
                    Submission.version_scores.any(SubmissionVersionScore.version == version_filter)
                )
            )

        # 2. Module filtering
        if module_ids and len(module_ids) > 0:
            module_ids = [int(mid) for mid in module_ids]
            submission_ids_with_modules = (
                db.session.query(BenchmarkScore.submission_id)
                .filter(BenchmarkScore.module_id.in_(module_ids))
                .group_by(BenchmarkScore.submission_id)
                .having(db.func.count(db.distinct(BenchmarkScore.module_id)) == len(module_ids))
                .subquery()
            )
            query = query.filter(Submission.id.in_(submission_ids_with_modules))

        # 3. Search filter
        if search_term:
            search_pattern = f"%{search_term}%"
            query = query.filter(
                or_(
                    Submission.name.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                    User.research_institute.ilike(search_pattern)
                )
            )

        all_submissions = query.all()

        submissions_with_scores = []
        for submission in all_submissions:
            display_score = None
            display_version = None
            matching_snapshot = None

            if submission.version_scores:
                target_ver = version_filter or submission.version
                matching_snapshot = next(
                    (vs for vs in submission.version_scores if vs.version == target_ver),
                    None
                )

            if matching_snapshot:
                display_score = matching_snapshot.score
                display_version = matching_snapshot.version
            elif submission.version == version_filter or not version_filter:
                display_score = submission.score
                display_version = submission.version

            # Strict Filter: omit submission if no valid score exists for requested version
            if version_filter and display_score is None:
                continue

            score_lookup = {
                bs.module_id: bs for bs in submission.benchmark_scores if bs.benchmark_module
            }

            module_scores = []
            if module_ids and len(module_ids) > 0:
                for mid in module_ids:
                    bs = score_lookup.get(mid)
                    if bs:
                        module_scores.append({
                            "moduleId": bs.module_id,
                            "moduleName": bs.benchmark_module.name,
                            "moduleVersion": bs.benchmark_module.version,
                            "score": bs.score,
                        })

                if module_weights and module_scores:
                    total_weighted_score = sum(ms["score"] * module_weights.get(str(ms["moduleId"]), 1.0) for ms in module_scores)
                    total_weight = sum(module_weights.get(str(ms["moduleId"]), 1.0) for ms in module_scores)
                    if total_weight > 0:
                        display_score = round(total_weighted_score / total_weight, 2)
                elif module_scores:
                    display_score = round(sum(ms["score"] for ms in module_scores) / len(module_scores), 2)
            else:
                # Include modules recorded in the version snapshot (including historical/archived modules)
                if matching_snapshot and matching_snapshot.modules:
                    for mod in matching_snapshot.modules:
                        bs = score_lookup.get(mod.id)
                        if bs:
                            module_scores.append({
                                "moduleId": mod.id,
                                "moduleName": mod.name,
                                "moduleVersion": mod.version,
                                "score": bs.score,
                            })
                else:
                    for bs in submission.benchmark_scores:
                        if bs.benchmark_module:
                            module_scores.append({
                                "moduleId": bs.module_id,
                                "moduleName": bs.benchmark_module.name,
                                "moduleVersion": bs.benchmark_module.version,
                                "score": bs.score,
                            })

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
                    "profilePicturePath": submission.user.profile_picture_path,
                    "bio": submission.user.bio
                },
            }
            submissions_with_scores.append(submission_data)

        # Sort results
        sort_key_map = {
            "score": lambda x: (x["overallScore"] is not None, x["overallScore"]),
            "name": lambda x: x["name"].lower() if x["name"] else "",
            "submissionDate": lambda x: x["submissionDate"],
            "username": lambda x: x["user"]["username"].lower() if x["user"]["username"] else "",
        }

        sort_key = sort_key_map.get(sort_by, sort_key_map["score"])
        reverse_order = sort_order == "desc"
        sorted_submissions = sorted(submissions_with_scores, key=sort_key, reverse=reverse_order)

        total = len(sorted_submissions)
        offset = (page - 1) * limit
        paginated_results = sorted_submissions[offset : offset + limit]
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return jsonify({
            "results": paginated_results,
            "totalEntries": total,
            "totalPages": total_pages,
            "currentPage": page,
        }), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@ranking_bp.route("/ranking/detail", methods=["POST"])
@jwt_required(optional=True)
def get_submission_detail():
    try:
        data = request.get_json() or {}
        submission_id = data.get("id")
        target_version = data.get("version")
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
            .options(
                joinedload(Submission.user),
                joinedload(Submission.submission_metadata),
                joinedload(Submission.version_scores).joinedload(SubmissionVersionScore.modules),
                joinedload(Submission.benchmark_scores).joinedload(BenchmarkScore.benchmark_module)
            )
            .one_or_none()
        )

        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        if not submission.is_public:
            if not current_user_id or (int(current_user_id) != submission.user_id and not is_admin):
                return jsonify({"message": "This submission is private."}), 403

        # Locate version snapshot if requested
        effective_version = target_version or submission.version
        matching_snapshot = None
        if submission.version_scores:
            matching_snapshot = next(
                (vs for vs in submission.version_scores if vs.version == effective_version),
                None
            )

        display_score = matching_snapshot.score if matching_snapshot else submission.score

        # Map all raw benchmark scores
        score_lookup = {
            bs.module_id: bs for bs in submission.benchmark_scores if bs.benchmark_module
        }

        # Build module score list based on the version's module snapshot
        module_scores_detail = []
        if matching_snapshot and matching_snapshot.modules:
            for mod in matching_snapshot.modules:
                bs = score_lookup.get(mod.id)
                if bs:
                    module_scores_detail.append({
                        "id": bs.id,
                        "score": bs.score,
                        "createdAt": bs.created_at.isoformat(),
                        "benchmarkModule": {
                            "id": mod.id,
                            "name": mod.name,
                            "title": mod.title,
                            "version": mod.version,
                            "description": mod.description,
                            "isActive": mod.is_active,
                            "createdAt": mod.created_at.isoformat() if mod.created_at else None,
                        },
                    })
        else:
            for bs in submission.benchmark_scores:
                if bs.benchmark_module:
                    module_scores_detail.append({
                        "id": bs.id,
                        "score": bs.score,
                        "createdAt": bs.created_at.isoformat(),
                        "benchmarkModule": {
                            "id": bs.benchmark_module.id,
                            "name": bs.benchmark_module.name,
                            "title": bs.benchmark_module.title,
                            "version": bs.benchmark_module.version,
                            "description": bs.benchmark_module.description,
                            "isActive": bs.benchmark_module.is_active,
                            "createdAt": bs.benchmark_module.created_at.isoformat() if bs.benchmark_module.created_at else None,
                        },
                    })

        # Calculate custom weights if provided on the detail page
        if module_weights and module_scores_detail:
            total_weighted = sum(
                m["score"] * module_weights.get(str(m["benchmarkModule"]["id"]), 1.0)
                for m in module_scores_detail
            )
            total_weight = sum(
                module_weights.get(str(m["benchmarkModule"]["id"]), 1.0)
                for m in module_scores_detail
            )
            if total_weight > 0:
                display_score = round(total_weighted / total_weight, 2)

        # Available versions for the detail view dropdown
        available_versions_list = [
            {"version": vs.version, "score": vs.score} for vs in submission.version_scores
        ] if submission.version_scores else [{"version": submission.version, "score": submission.score}]

        submission_detail = {
            "id": submission.id,
            "name": submission.name,
            "submissionDate": submission.submission_date.isoformat(),
            "status": submission.status.value,
            "isPublic": submission.is_public,
            "overallScore": display_score,
            "version": effective_version,
            "availableVersions": available_versions_list,
            "metadata": {
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
            } if submission.submission_metadata else None,
            "user": {
                "id": submission.user.id,
                "username": submission.user.username,
                "mailAddress": submission.user.mail_address,
                "badges": submission.user.badges or [],
                "researchInstitute": submission.user.research_institute,
                "profilePicturePath": submission.user.profile_picture_path,
                "bio": submission.user.bio,
                "isEmailPublic": submission.user.is_email_public,
            },
            "benchmarkScores": module_scores_detail,
        }

        return jsonify({"submission": submission_detail}), 200

    except Exception as e:
        return jsonify({"message": "Internal server error", "error": str(e)}), 500

@ranking_bp.route("/ranking/detail", methods=["PUT"])
@jwt_required()
def update_submission_detail():
    try:
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)
        
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

        if submission.user_id != user_id and not is_admin:
            return jsonify({"message": "Forbidden: Cannot edit another user's submission"}), 403

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
                "profilePicturePath": submission.user.profile_picture_path,
                "bio": submission.user.bio
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