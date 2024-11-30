from flask import Blueprint, request, jsonify, current_app
from flask import send_from_directory
from ..extensions import db
from datetime import datetime
from ..models import Dataset
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATASET_FOLDER = os.path.join(PROJECT_ROOT, "data")

# Log the path when module loads
logger.info(f"Dataset folder path: {DATASET_FOLDER}")

data_bp = Blueprint('data', __name__)

@data_bp.route('/load-dataset', methods=['POST'])
def load_dataset():
    try:
        # Extract dataset name from the request
        data = request.get_json()
        dataset_name = data.get('name')
        
        # Construct full file path
        file_path = os.path.join(DATASET_FOLDER, dataset_name)
        
        # Debug logs
        logger.info("=== Debug Information ===")
        logger.info(f"Looking for file at: {file_path}")
        logger.info(f"DATASET_FOLDER is: {DATASET_FOLDER}")
        logger.info(f"File exists: {os.path.exists(file_path)}")
        
        # List contents of DATASET_FOLDER
        logger.info("Contents of DATASET_FOLDER:")
        if os.path.exists(DATASET_FOLDER):
            logger.info(os.listdir(DATASET_FOLDER))
        else:
            logger.info("DATASET_FOLDER does not exist!")

        # Check if the dataset file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found at path: {file_path}")
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
