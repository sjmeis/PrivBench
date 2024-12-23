from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required
)
from ..models import BenchmarkModule
from ..models.user import User

module_bp = Blueprint('benchmark_module', __name__)


@module_bp.route('/modules', methods=['GET'])
def get_all_benchmark_modules():
    try:
        modules = BenchmarkModule.query.all()

        module_list = []
        for module in modules:
            dataset = module.dataset

            module_info = {
                "id": module.id,
                "name": module.name,
                "title": module.title,
                "version": module.version,
                "isActive": module.is_active,
                "createdAt": module.created_at.isoformat() if module.created_at else None,
                "path": module.path,
                "datasetId": module.dataset_id,
                "description": module.description,
                "dataset": {
                    "id": dataset.id,
                    "name": dataset.name,
                    "filePath": dataset.file_path,
                    "createdAt": dataset.created_at.isoformat() if dataset.created_at else None,
                    "isActive": dataset.is_active
                } if dataset else None
            }

            module_list.append(module_info)

        return jsonify(module_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch benchmark modules", "details": str(e)}), 500

@module_bp.route('/modules/create', methods=['POST'])
@jwt_required()
def create_benchmark_module():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            return jsonify({"message": "User not found"}), 404

        if not user.admin:
            return jsonify({"message": "User doesn't possess the necessary permissions."}), 403

        data = request.get_json()

        required_fields = ['name', 'description', 'algorithmFile', 'selectedDatasets', 'uploadedDatasets']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missingFields": missing_fields
            }), 400

        # //todo: place business logic call to create new benchmarking module here
        # //todo: Step 1: Create new benchmarking module with respective file
        # //todo: Step 2: Save and create new datasets (if new) and create association to new benchmarking  module
        # //todo: Step 3: Set all previous submission to oudated

        print("Received Data:", data)

        # Return a success response
        return jsonify({
            "message": "Benchmark module data received successfully",
            "data": data
        }), 201

    except Exception as e:
        return jsonify({
            "error": "An error occurred while processing the request",
            "details": str(e)
        }), 500
