from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from ..utils.monitor import system_stats
from ..models.user import User
from ..models.submission import Submission
from ..models.dataset import Dataset
from ..models.benchmark_module import BenchmarkModule
from ..models.benchmark_score import BenchmarkScore
from ..models.benchmark_queue import BenchmarkQueue
from ..models.app_version import AppVersion
from ..models.module_update import ModuleUpdate
from ..models.submission_version_score import SubmissionVersionScore
from ..enums import SubmissionStatus
from .. import db
from datetime import datetime, timedelta
import os
from sqlalchemy import or_, text
from werkzeug.utils import secure_filename
import docker
import logging
from ..utils.module_manager import ModuleManager
from ..utils.container_manager import module_image_tag, module_container_name

from ..tasks.add_module import install_and_load_module
from .module import _find_existing_requirements_path

import sys
sys.path.append("/app")
from populate_db import install_demo_data, purge_demo_data

import psutil
try:
    import pynvml
    pynvml.nvmlInit()
    HAS_GPU = True
except:
    HAS_GPU = False

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)
client = docker.from_env()
module_manager = ModuleManager()

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "data/privatized_datasets")

@admin_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    # Security: Verify the 'admin' claim in the JWT
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Administrative access required"}), 403

    days = request.args.get('days', default=30, type=int)
    period_start = datetime.utcnow() - timedelta(days=days)

    users = User.query.all()
    output = []

    for user in users:
        total_subs = len(user.submissions)
        
        recent_subs = Submission.query.filter(
            Submission.user_id == user.id,
            Submission.submission_date >= period_start
        ).count()

        output.append({
            "id": user.id,
            "username": user.username,
            "mailAddress": user.mail_address,
            "researchInstitute": user.research_institute,
            "dailyLimit": user.daily_submission_limit,
            "totalSubmissions": total_subs,
            "recentSubmissions": recent_subs
        })

    return jsonify(output), 200

@admin_bp.route('/admin/users/<int:user_id>/limit', methods=['PUT'])
@jwt_required()
def update_user_limit(user_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.get_json()
    new_limit = data.get('dailyLimit')

    if new_limit is None or int(new_limit) < 0:
        return jsonify({"message": "Invalid limit value"}), 400

    user = User.query.get_or_404(user_id)
    user.daily_submission_limit = int(new_limit)
    db.session.commit()

    return jsonify({"message": f"Updated limit for {user.username}"}), 200

@admin_bp.route('/user/admin-delete/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    user = User.query.get_or_404(user_id)
    
    if user.profile_picture_path:
        file_path = os.path.join(current_app.root_path, user.profile_picture_path.lstrip('/'))
        if os.path.exists(file_path):
            os.remove(file_path)

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User successfully deleted by administrator"}), 200

@admin_bp.route('/datasets/<int:dataset_id>/replace', methods=['PUT'])
@jwt_required()
def replace_dataset_file(dataset_id):
    if not get_jwt().get("is_admin"):
        return jsonify({"message": "Unauthorized"}), 403

    dataset = Dataset.query.get_or_404(dataset_id)
    
    if 'file' not in request.files:
        return jsonify({"message": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    original_name = secure_filename(file.filename)
    
    old_path = os.path.join(DATASET_FOLDER, dataset.file_path)
    if os.path.exists(old_path):
        os.remove(old_path)

    upload_path = os.path.join(DATASET_FOLDER, original_name)
    file.save(upload_path)
    
    dataset.file_path = os.path.join(DATASET_FOLDER, original_name)
    dataset.created_at = datetime.utcnow() # Update timestamp
    db.session.commit()

    return jsonify({
        "message": f"Successfully replaced with {original_name}",
        "fileName": original_name
    }), 200

@admin_bp.route('/submissions', methods=['GET'])
@jwt_required()
def get_all_submissions_admin():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Unauthorized"}), 403
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    sort_by = request.args.get('sortBy', 'created_at')
    sort_order = request.args.get('sortOrder', 'desc')
    search = request.args.get('search', '').strip()

    #submissions = Submission.query.order_by(Submission.created_at.desc()).all()

    query = db.session.query(Submission).join(User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Submission.name.ilike(search_term),
            User.username.ilike(search_term),
            User.research_institute.ilike(search_term)
        ))

    sort_map = {
        'name': Submission.name,
        'username': User.username,
        'score': Submission.score,
        'date': Submission.created_at,
        'status': Submission.status
    }
    col = sort_map.get(sort_by, Submission.created_at)
    query = query.order_by(col.desc() if sort_order == 'desc' else col.asc())

    paginated = query.paginate(page=page, per_page=limit, error_out=False)
    
    return jsonify({
        "results": [{
            "id": sub.id,
            "name": sub.name,
            "username": sub.user.username,
            "userEmail": sub.user.mail_address,
            "status": sub.status.value,
            "score": sub.score,
            "isPublic": sub.is_public,
            "date": sub.created_at.isoformat(),
            "version": sub.version,
            "metadata": {
                "description": sub.submission_metadata.model_description if sub.submission_metadata else "N/A",
                "institute": sub.user.research_institute,
                "datasetCount": len(sub.datasets)
            }
        } for sub in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "currentPage": paginated.page
    }), 200

@admin_bp.route('/submissions/<int:sub_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_submission(sub_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    submission = Submission.query.get_or_404(sub_id)

    for p_dataset in submission.privatized_datasets:
        if p_dataset.file_path:
            full_path = os.path.join(UPLOAD_FOLDER, p_dataset.file_path)
            if os.path.exists(full_path):
                os.remove(full_path)

    db.session.execute(
            text("DELETE FROM benchmark_queue WHERE submission_id = :sub_id"),
            {"sub_id": sub_id}
        )

    db.session.execute(
        text("DELETE FROM submission_datasets WHERE submission_id = :sub_id"),
        {"sub_id": sub_id}
    )

    submission.datasets = []
    db.session.commit()
    db.session.delete(submission)
    db.session.commit()

    return jsonify({"message": "Submission deleted by admin"}), 200

@admin_bp.route('/submissions/<int:sub_id>/toggle-visibility', methods=['PUT'])
@jwt_required()
def admin_toggle_visibility(sub_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    submission = Submission.query.get_or_404(sub_id)
    submission.is_public = not submission.is_public
    db.session.commit()
    
    status = "public" if submission.is_public else "private"
    return jsonify({"message": f"Submission is now {status}", "isPublic": submission.is_public}), 200

@admin_bp.route('/system-health')
@jwt_required()
def system_health():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403
    
    return jsonify(system_stats)

@admin_bp.route('/modules/status', methods=['GET'])
@jwt_required()
def get_modules_status():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    modules = BenchmarkModule.query.all()
    results = []
    
    # Get all running containers to check status
    containers = {c.name: c.status for c in client.containers.list(all=True)}
    
    for m in modules:
        tag = module_image_tag(m.name)
        container_name = module_container_name(m.name)
        
        # Check if image exists
        image_exists = False
        try:
            client.images.get(tag)
            image_exists = True
        except docker.errors.ImageNotFound:
            pass

        results.append({
            "id": m.id,
            "name": m.name,
            "use_gpu": m.use_gpu,
            "db_status": "Active",
            "image_exists": image_exists,
            "container_status": containers.get(container_name, "Not Created")
        })
    return jsonify(results)

@admin_bp.route('/modules/start/<int:module_id>', methods=['POST'])
@jwt_required()
def start_container(module_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    module = BenchmarkModule.query.get_or_404(module_id)
    image_tag = f"{module_image_tag(module.name)}:latest"
    container_name = module_container_name(module.name)
    
    try:
        # If an old container exists but is stopped, remove it first
        try:
            old_container = client.containers.get(container_name)
            old_container.remove(force=True)
        except:
            pass

        # Start new container
        device_requests = []
        use_gpu_flag = (module.device_specification == "gpu" or getattr(module, "use_gpu", False))
        if use_gpu_flag:
            device_requests = [docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])]

        client.containers.run(
            image_tag,
            name=container_name,
            detach=True,
            device_requests=device_requests,
            network="privbench_default"
        )
        return jsonify({"message": f"Started {module.name}"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@admin_bp.route('/modules/stop/<int:module_id>', methods=['POST'])
@jwt_required()
def stop_container(module_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    module = BenchmarkModule.query.get_or_404(module_id)
    container_name = module_container_name(module.name)
    try:
        container = client.containers.get(container_name)
        container.stop()
        return jsonify({"message": f"Stopped {module.name}"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@admin_bp.route('/modules/rebuild/<int:module_id>', methods=['POST'])
@jwt_required()
def rebuild_module(module_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    module = BenchmarkModule.query.get_or_404(module_id)
    use_gpu_flag = (module.device_specification == "gpu" or getattr(module, "use_gpu", False))
    try:
        # 1. Stop and remove existing container
        container_name = module_container_name(module.name)
        try:
            container = client.containers.get(container_name)
            container.remove(force=True)
        except:
            pass

        # 2. Trigger ModuleManager build logic
        module_manager.build_module_container(
            module_path=module.path,
            module_name=module.name,
            requirements_path=module.requirements_path,
            use_gpu=use_gpu_flag
        )
        return jsonify({"message": f"Rebuilt {module.name}"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@admin_bp.route('/modules/purge/<int:module_id>', methods=['POST'])
@jwt_required()
def purge_module(module_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    module = BenchmarkModule.query.get_or_404(module_id)
    try:
        # 1. Kill Container
        container_name = module_container_name(module.name)
        try:
            container = client.containers.get(container_name)
            container.remove(force=True)
        except:
            pass

        # 2. Delete Image
        image_tag = f"{module_image_tag(module.name)}:latest"
        try:
            client.images.remove(image=image_tag, force=True)
        except:
            pass

        # 3. Wipe Database Scores (This is why it's a 'Purge')
        BenchmarkScore.query.filter_by(module_id=module_id).delete()
        db.session.commit()

        return jsonify({"message": f"Successfully purged {module.name} and all associated scores"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500
    
@admin_bp.route('/modules/logs/<int:module_id>', methods=['GET'])
@jwt_required()
def get_module_logs(module_id):
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    module = BenchmarkModule.query.get_or_404(module_id)
    container_name = module_container_name(module.name)
    try:
        container = client.containers.get(container_name)
        logs = container.logs(tail=100, stdout=True, stderr=True).decode('utf-8')
        return jsonify({"logs": logs}), 200
    except docker.errors.NotFound:
        return jsonify({"logs": "Container not found. Start the container to see logs."}), 404
    except Exception as e:
        return jsonify({"logs": f"Error fetching logs: {str(e)}"}), 500

@admin_bp.route('/admin/version/rollback', methods=['POST'])
@jwt_required()
def rollback_version():
    claims = get_jwt()
    if not claims.get("is_admin"):
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json()
    target_version_str = data.get("targetVersion") or data.get("version")
    
    try:
        target_release = AppVersion.query.filter_by(version=target_version_str).first()
        if not target_release:
            return jsonify({"message": "Target version snapshot not found"}), 404

        bad_versions = AppVersion.query.filter(AppVersion.created_at > target_release.created_at).all()
        bad_version_strs = [v.version for v in bad_versions]
        bad_version_ids = [v.id for v in bad_versions]

        if not bad_version_ids:
            return jsonify({"message": "Already at or below target checkpoint version"}), 400

        # ----------------------------------------------------
        # GIT-STYLE RESTORE WORKFLOW:
        # Read the blueprint array and map parameters back
        # ----------------------------------------------------
        blueprint = target_release.blueprint
        if not blueprint:
            return jsonify({"message": "Target version is missing a state blueprint"}), 400
            
        target_module_ids = [item["module_id"] for item in blueprint]

        # Deactivate modules created after this version (soft-delete)
        db.session.query(BenchmarkModule).filter(
            BenchmarkModule.id.not_in(target_module_ids)
        ).update({"is_active": False}, synchronize_session=False)

        # Realign module configurations to match the snapshot blueprint
        for item in blueprint:
            m = db.session.query(BenchmarkModule).get(item["module_id"])
            if m:
                m.is_active = True
                m.name = item["name"]
                m.title = item["title"]
                m.path = item["path"]
                m.device_specification = item["device_specification"]
                if "sample_count" in item:
                    m.sample_count = item["sample_count"]
                
                if "compatible_datasets" in item:
                    datasets = Dataset.query.filter(Dataset.name.in_(item["compatible_datasets"])).all()
                    m.compatible_datasets = datasets

                try:
                    # Force reload/restart the container to use the rolled-back paths/specs
                    install_and_load_module.delay(
                        module_id=m.id,
                        module_name=m.name,
                        module_path=m.path,
                        requirements_path=_find_existing_requirements_path(m),
                        is_new_module=False,
                        restart_container=True,
                        use_gpu=m.device_specification == "gpu"
                    )
                except Exception as e:
                    logger.warning(f"Could not automatically sync container state during rollback: {e}")
                        
        db.session.flush()

        all_submissions = Submission.query.all()
        for sub in all_submissions:
            if sub.version in bad_version_strs:
                target_snapshot = SubmissionVersionScore.query.filter_by(
                    submission_id=sub.id, 
                    version=target_version_str
                ).first()

                if not target_snapshot:
                    sub.status = SubmissionStatus.OUTDATED
                    sub.score = None
                else:
                    sub.version = target_version_str
                    sub.status = SubmissionStatus.COMPLETED
                    sub.score = target_snapshot.score
                    
                    if sub.submission_metadata:
                        sub.submission_metadata.version = target_version_str
                        
            elif sub.version == target_version_str and sub.status == SubmissionStatus.OUTDATED:
                sub.status = SubmissionStatus.COMPLETED

        SubmissionVersionScore.query.filter(SubmissionVersionScore.version.in_(bad_version_strs)).delete(synchronize_session=False)
        ModuleUpdate.query.filter(ModuleUpdate.version_id.in_(bad_version_ids)).delete(synchronize_session=False)
        AppVersion.query.filter(AppVersion.id.in_(bad_version_ids)).delete(synchronize_session=False)
        
        db.session.commit()
        return jsonify({"message": f"Successfully checked out platform state at v{target_version_str}"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Checkpoint restoration failed: {str(e)}"}), 500
    
@admin_bp.route('/admin/demo-data/toggle', methods=['POST'])
@jwt_required()
def toggle_demo_data():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    enable_demo = data.get("enable", False)

    try:
        if enable_demo:
            has_demo = User.query.filter(User.username.ilike("demo_%")).first() is not None
            if has_demo:
                return jsonify({"message": "Demo data is already initialized on this system context."}), 400

            success = install_demo_data()
            if not success:
                return jsonify({"message": "Failed to install demo data. Verify modules/datasets exist."}), 400
                
            return jsonify({"message": "Database populated with mock data successfully.", "demoActive": True}), 201
        else:
            success = purge_demo_data()
            return jsonify({"message": "Database cleared of mock data safely.", "demoActive": False}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Demo toggle process encountered an issue: {str(e)}"}), 500

@admin_bp.route('/admin/demo-data/status', methods=['GET'])
@jwt_required()
def get_demo_data_status():
    """Simple check to update the frontend toggle switch state upon loading."""
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return jsonify({"message": "Forbidden"}), 403
        
    has_demo = User.query.filter(User.username.ilike("demo_%")).first() is not None
    return jsonify({"demoActive": has_demo}), 200

@admin_bp.route('/admin/management/list', methods=['GET'])
@jwt_required()
def get_admin_management_list():
    """Returns an overview of users possessing administrative privileges."""
    claims = get_jwt()
    if not claims.get("is_superadmin", False):
        return jsonify({"message": "Superadmin privileges required to manage team permissions."}), 403

    admins = User.query.filter(User.admin == True, User.is_superadmin == False).all()
    
    non_admins = User.query.filter(User.admin == False).limit(100).all()

    return jsonify({
        "currentAdmins": [{
            "id": u.id,
            "username": u.username,
            "mailAddress": u.mail_address,
            "researchInstitute": u.research_institute
        } for u in admins],
        "candidates": [{
            "id": u.id,
            "username": u.username,
            "mailAddress": u.mail_address,
            "researchInstitute": u.research_institute
        } for u in non_admins]
    }), 200


@admin_bp.route('/admin/management/toggle/<int:user_id>', methods=['POST'])
@jwt_required()
def toggle_user_admin_status(user_id):
    """Promotes or demotes an account between User and Administrator roles."""
    claims = get_jwt()
    if not claims.get("is_superadmin", False):
        return jsonify({"message": "Forbidden. Requires Superadmin role."}), 403

    user = User.query.get_or_404(user_id)
    
    if user.is_superadmin:
        return jsonify({"message": "Root superadmin cannot be demoted."}), 400

    data = request.get_json() or {}
    make_admin = data.get("admin", False)

    user.admin = make_admin
    db.session.commit()

    status_txt = "promoted to Admin" if make_admin else "demoted to standard User status"
    return jsonify({"message": f"Successfully {status_txt} for {user.username}.", "admin": user.admin}), 200