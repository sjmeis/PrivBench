from flask import Blueprint, jsonify
from ..extensions import db
from ..models import BenchmarkModule

module_bp = Blueprint('benchmark_module', __name__)

# @module_bp.route('/modules', methods=['GET'])
# def get_all_benchmark_modules():
#     try:
#         # Query all benchmark modules from the database
#         modules = BenchmarkModule.query.all()
#
#         # Convert the query results into a JSON-serializable format
#         module_list = [
#             {
#                 "id": module.id,
#                 "name": module.name,
#                 "title": module.title,
#                 "version": module.version,
#                 "is_active": module.is_active,
#                 "created_at": module.created_at.isoformat() if module.created_at else None,
#                 "path": module.path,
#                 "dataset_id": module.dataset_id,
#                 "description": module.description,
#             }
#             for module in modules
#         ]
#
#         # Return the list as JSON response
#         return jsonify(module_list), 200
#     except Exception as e:
#         # Handle any exceptions and return an error response
#         return jsonify({"error": "Failed to fetch benchmark modules", "details": str(e)}), 500


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