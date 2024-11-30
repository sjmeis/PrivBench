from flask import Blueprint, request, jsonify
from flask import send_from_directory
from ..extensions import db
from datetime import datetime
from ..models import Dataset
import os

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))

# Define the folder where the datasets are stored
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data")

data_bp = Blueprint('data', __name__)

@data_bp.route('/load-dataset', methods=['POST'])
def load_dataset():
    try:
        # Extract dataset name from the request
        data = request.get_json()
        dataset_name = data.get('name')
        
        # Construct full file path
        file_path = os.path.join(DATASET_FOLDER, dataset_name)

        # Check if the dataset file exists
        if not os.path.exists(file_path):
            return jsonify({'error': 'Dataset file not found'}), 404

        # Create a new Dataset entry
        new_dataset = Dataset(
            name=dataset_name,
            file_path=file_path,
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        # Add and commit the new entry to the database
        db.session.add(new_dataset)
        db.session.commit()

        return jsonify({'message': 'Dataset entry created successfully', 'dataset_id': new_dataset.id}), 201

    except Exception as e:
        # Handle any errors
        return jsonify({'error': str(e)}), 500

@data_bp.route('/datasets/<filename>', methods=['GET'])
def get_dataset(filename):
    try:
        # Ensure the file exists in the dataset folder
        if not os.path.exists(os.path.join(DATASET_FOLDER, filename)):
            return jsonify({'error': 'File not found'}), 404

        # Serve the file
        return send_from_directory(DATASET_FOLDER, filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
