from flask import Blueprint, request, jsonify, current_app
from flask import send_from_directory
import os
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import PrivatizedDataset, Submission, Dataset
from datetime import datetime
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


PRIVATIZED_DATASETS_FOLDER = os.path.join(PROJECT_ROOT, "data", "privatized_datasets")

# Ensure the privatized datasets directory exists
os.makedirs(PRIVATIZED_DATASETS_FOLDER, exist_ok=True)

@data_bp.route('/upload-privatized-dataset', methods=['POST'])
def upload_privatized_dataset():
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        submission_id = request.form.get('submission_id')
        original_dataset_id = request.form.get('original_dataset_id')
        
        if not all([file, submission_id, original_dataset_id]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate file
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Invalid file type. Only CSV files are allowed'}), 400
        
        # Create a secure filename and save the file
        filename = secure_filename(f"{submission_id}_{original_dataset_id}_{file.filename}")
        file_path = os.path.join(PRIVATIZED_DATASETS_FOLDER, filename)
        
        # Save the file
        file.save(file_path)
        
        # Create new PrivatizedDataset entry
        privatized_dataset = PrivatizedDataset(
            submission_id=submission_id,
            original_dataset_id=original_dataset_id,
            file_path=file_path,
            created_at=datetime.utcnow(),
            processing_status='pending'
        )
        
        # Add and commit to database
        db.session.add(privatized_dataset)
        db.session.commit()
        
        logger.info(f"Successfully uploaded privatized dataset: {filename}")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'privatized_dataset_id': privatized_dataset.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error uploading privatized dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500

@data_bp.route('/submission-datasets/<int:submission_id>', methods=['GET'])
def get_submission_datasets(submission_id):
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
            
        datasets = [{
            'id': dataset.id,
            'name': dataset.name,
            'has_privatized': any(pd.original_dataset_id == dataset.id 
                                for pd in submission.privatized_datasets)
        } for dataset in submission.datasets]
        
        return jsonify(datasets), 200
        
    except Exception as e:
        logger.error(f"Error fetching submission datasets: {str(e)}")
        return jsonify({'error': str(e)}), 500