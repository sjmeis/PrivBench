from flask import Blueprint, jsonify
from ..extensions import db, celery
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import BenchmarkModule, Submission, User, Dataset, PrivatizedDataset, BenchmarkScore
from ..enums import SubmissionStatus
from datetime import datetime
from app.tasks.run_benchmark import run_benchmark
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@celery.task(bind=True)
def run_benchmark_task(self, module_path, module_name, dataset_path, priv_dataset_path):
    """Run a benchmark module as a Celery task."""
    logger.info(f"Starting benchmark task for module {module_name}")
    try:
        total_steps = 100
        
        # Stage 1: Initialization (10%)
        logger.info(f"Module {module_name}: Initialization stage")
        self.update_state(state='PROGRESS', 
                         meta={'current': 10, 
                               'total': total_steps, 
                               'status': 'Initializing benchmark environment...'})
        
        # Stage 2: Loading Data (30%)
        logger.info(f"Module {module_name}: Loading data")
        logger.info(f"Paths - module: {module_path}, dataset: {dataset_path}, priv_dataset: {priv_dataset_path}")
        self.update_state(state='PROGRESS', 
                         meta={'current': 30, 
                               'total': total_steps, 
                               'status': 'Loading and validating datasets...'})
        
        # Stage 3: Running Benchmark (80%)
        logger.info(f"Module {module_name}: Running benchmark")
        self.update_state(state='PROGRESS', 
                         meta={'current': 80, 
                               'total': total_steps, 
                               'status': f'Running benchmark module: {module_name}...'})
        
        score = run_benchmark(module_path, module_name, dataset_path, priv_dataset_path)
        logger.info(f"Module {module_name}: Benchmark completed with score {score}")
        
        # Stage 4: Completion (100%)
        result = {
            'current': total_steps,
            'total': total_steps,
            'status': 'Benchmark completed successfully!',
            'score': score,
            'state': 'SUCCESS'
        }
        
        logger.info(f"Module {module_name}: Task completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Benchmark task failed for module {module_name}: {str(e)}", exc_info=True)
        raise

benchmark_bp = Blueprint('benchmark', __name__)

@benchmark_bp.route('/run-benchmark', methods=['POST'])
@jwt_required()
def benchmark():
    """Endpoint to start benchmark tasks."""
    try:
        user_id = get_jwt_identity()
        logger.info(f"Starting benchmark for user {user_id}")
        
        # Retrieve submission
        submission = db.session.query(Submission).filter_by(user_id=user_id, status=SubmissionStatus.PENDING).first()
        if not submission:
            logger.error("No pending submissions found")
            return jsonify({"message": "No pending submissions found"}), 404
        
        submission.status = SubmissionStatus.IN_PROGRESS
        db.session.commit()
        logger.info(f"Found submission {submission.id}, status updated to IN_PROGRESS")
        
        # Start tasks for each module
        tasks = []
        benchmark_modules = db.session.query(BenchmarkModule).filter_by(is_active=True).all()
        
        for module in benchmark_modules:
            logger.info(f"Processing module: {module.name}")
            dataset = db.session.query(Dataset).filter_by(id=module.dataset_id).first()
            if not dataset:
                logger.error(f"Dataset not found for module {module.name}")
                continue
            
            privatized_dataset = db.session.query(PrivatizedDataset).filter_by(
                submission_id=submission.id,
                original_dataset_id=module.dataset_id
            ).first()
            if not privatized_dataset:
                logger.error(f"Privatized dataset not found for module {module.name}")
                continue
            
            logger.info(f"Starting task for module {module.name}")
            task = run_benchmark_task.delay(
                module.path,
                module.name,
                dataset.file_path,
                privatized_dataset.file_path
            )
            
            tasks.append({
                "task_id": task.id,
                "module_id": module.id,
                "module_name": module.name
            })
            logger.info(f"Task created for module {module.name}: {task.id}")
        
        if not tasks:
            submission.status = SubmissionStatus.FAILED
            db.session.commit()
            logger.error("No benchmark tasks could be started")
            return jsonify({"message": "No benchmark tasks could be started"}), 400
            
        logger.info(f"Successfully started {len(tasks)} tasks")
        return jsonify({"task_ids": tasks}), 202

    except Exception as e:
        logger.error(f"Error in benchmark endpoint: {str(e)}", exc_info=True)
        db.session.rollback()
        if submission:
            submission.status = SubmissionStatus.FAILED
            db.session.commit()
        return jsonify({"message": str(e)}), 500

@benchmark_bp.route('/task-status/<task_id>', methods=['GET'])
@jwt_required()
def task_status(task_id):
    """Get the status of a task."""
    task = run_benchmark_task.AsyncResult(task_id)
    logger.info(f"Checking status for task {task_id}: {task.state}")
    
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 100,
            'status': 'Pending...'
        }
    elif task.state == 'FAILURE':
        response = {
            'state': task.state,
            'current': 0,
            'total': 100,
            'status': str(task.info)
        }
        logger.error(f"Task {task_id} failed: {str(task.info)}")
    elif task.state == 'SUCCESS':
        response = {
            'state': task.state,
            'current': 100,
            'total': 100,
            'status': 'Task completed!',
            'score': task.result.get('score')
        }
        logger.info(f"Task {task_id} completed with score {task.result.get('score')}")
    else:
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 100),
            'status': task.info.get('status', ''),
            'score': task.info.get('score', None)
        }
        logger.info(f"Task {task_id} in progress: {response}")
    
    return jsonify(response)