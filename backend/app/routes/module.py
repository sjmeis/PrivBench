from flask import Blueprint, jsonify
from ..extensions import db
from ..models import BenchmarkModule

module_bp = Blueprint('benchmark_module', __name__)

@module_bp.route('/modules', methods=['GET'])
def get_all_benchmark_modules():
    try:
        # Query all benchmark modules from the database
        modules = BenchmarkModule.query.all()

        # Convert the query results into a JSON-serializable format
        module_list = [
            {
                "id": module.id,
                "name": module.name,
                "title": module.title,
                "version": module.version,
                "is_active": module.is_active,
                "created_at": module.created_at.isoformat() if module.created_at else None,
                "path": module.path,
                "dataset_id": module.dataset_id,
                "description": module.description,
            }
            for module in modules
        ]

        # Return the list as JSON response
        return jsonify(module_list), 200
    except Exception as e:
        # Handle any exceptions and return an error response
        return jsonify({"error": "Failed to fetch benchmark modules", "details": str(e)}), 500
