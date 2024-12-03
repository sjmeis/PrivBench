from flask import Blueprint, jsonify
from ..extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import BenchmarkModule, Submission, User, Dataset, PrivatizedDataset, BenchmarkScore
from ..models.submission import SubmissionStatusEnum
import os
from datetime import datetime
from app.tasks.run_benchmark import run_benchmark
import logging

"""# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data/datasets")
PRIVATIZED_DATASETS_FOLDER = os.path.join(PROJECT_ROOT, "data", "privatized_datasets")"""

benchmark_bp = Blueprint('benchmark', __name__)

@benchmark_bp.route('/run-benchmark', methods=['POST'])
@jwt_required()
def benchmark():
    try:
        user_id = get_jwt_identity()
        
        # Retrieve submission
        submission = db.session.query(Submission).filter_by(user_id=user_id, status=SubmissionStatusEnum.PENDING).first()
        if not submission:
            return jsonify({"message": "No pending submissions found"}), 404
        submission_id = submission.id

        # Retrieve benchmark modules
        benchmark_modules = db.session.query(BenchmarkModule).all()

        scores = []
        for module in benchmark_modules:
            if module.is_active:
                dataset_id = module.dataset_id

                dataset = db.session.query(Dataset).filter_by(id=dataset_id).first()
                if not dataset:
                    submission.status = SubmissionStatusEnum.FAILED
                    db.session.commit()
                    return jsonify({"message": "Dataset not found"}), 404
                dataset_path = dataset.file_path

                privatized_dataset = db.session.query(PrivatizedDataset).filter_by(
                    submission_id=submission_id,
                    original_dataset_id=dataset_id
                ).first()
                if not privatized_dataset:
                    submission.status = SubmissionStatusEnum.FAILED
                    db.session.commit()
                    return jsonify({"message": "Privatized dataset not found"}), 404

                priv_dataset_path = privatized_dataset.file_path

                score = run_benchmark(module.path, module.name, dataset_path, priv_dataset_path)
                scores.append(score)
                
                benchmark_score = BenchmarkScore(
                    submission_id=submission_id,
                    module_id=module.id,
                    privatized_dataset_id=privatized_dataset.id,
                    score=score,
                    created_at=datetime.utcnow()
                )
                db.session.add(benchmark_score)
                #db.session.flush()

        if scores:
            average_score = sum(scores) / len(scores)
            submission.score = average_score
            submission.status = SubmissionStatusEnum.COMPLETED
            db.session.commit()
            return jsonify({"message": "Benchmark completed successfully", "average_score": average_score}), 200
        else:
            submission.status = SubmissionStatusEnum.FAILED
            db.session.commit()
            return jsonify({"message": "No scores calculated"}), 400

    except Exception as e:
        db.session.rollback()
        try:
            # Update submission status to FAILED
            if submission:  # Reuse the submission object if valid
                submission.status = SubmissionStatusEnum.FAILED
                db.session.commit()
            else:
                # Fallback: Re-query if submission is invalid
                submission = db.session.query(Submission).filter_by(user_id=user_id, status=SubmissionStatusEnum.PENDING).first()
                if submission:
                    submission.status = SubmissionStatusEnum.FAILED
                    db.session.commit()
        except Exception as update_error:
            return jsonify({"message": f"Error updating submission to FAILED: {update_error}"}), 500

        return jsonify({"message": str(e)}), 500