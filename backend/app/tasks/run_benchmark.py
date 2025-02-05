from celery.utils.log import get_task_logger
import docker
import json
import tempfile
from pathlib import Path
import shutil
import pandas as pd
import tarfile
from io import BytesIO
import os

logger = get_task_logger(__name__)

def run_benchmark(module_path, module_id, module_name, dataset_path, priv_dataset_path, progress_callback=None):
    """
    Run a benchmark module in a Docker container.
    The function maintains the same interface but executes the module in a container.
    """
    logger.info(f"Starting benchmark execution for module {module_name}")
    
    try:
        docker_client = docker.from_env()
        
        image_tag = f"module-{module_name.lower()}"
        logger.info(f"Looking for Docker image: {image_tag}")
        
        try:
            docker_client.images.get(image_tag)
            logger.info(f"Found Docker image: {image_tag}")
        except docker.errors.ImageNotFound:
            error_msg = f"Docker image {image_tag} not found. The module may not be properly installed."
            logger.error(error_msg)
            raise Exception(error_msg)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Copy required files
            shutil.copy2(module_path, temp_path / f"{module_name}.py")
            shutil.copy2(dataset_path, temp_path / "dataset.csv")
            shutil.copy2(priv_dataset_path, temp_path / "privatized_dataset.csv")
            
            # Create runner script with reusable module initialization
            runner_script = f"""
import pandas as pd
import sys
import importlib.util
from pathlib import Path

def run():
    try:
        # Load and initialize module
        module_path = Path('/app/{module_name}.py')
        spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Create benchmark instance
        benchmark_class = getattr(module, '{module_name}')
        benchmark_instance = benchmark_class()
        
        # Load datasets
        dataset = pd.read_csv('/app/dataset.csv')
        privatized_dataset = pd.read_csv('/app/privatized_dataset.csv')
        
        if dataset.shape != privatized_dataset.shape:
            raise ValueError(f"Dataset shapes don't match: {{dataset.shape}} vs {{privatized_dataset.shape}}")
        
        # Ensure the "text" column exists in both datasets
        if 'text' not in dataset.columns or 'text' not in privatized_dataset.columns:
            raise ValueError("'text' column is missing in one of the datasets")
        
        dataset_text = dataset['text'].to_list()
        privatized_dataset_text = privatized_dataset['text'].to_list()
            
        # Simple progress callback that just outputs the number of processed rows
        def progress_wrapper(processed_rows):
            if processed_rows is not None:
                print(f"PROGRESS:{{processed_rows}}")
                sys.stdout.flush()
        
        # Run the benchmark
        score = benchmark_instance.score(dataset_text, privatized_dataset_text, progress_wrapper)
        
        if score is None:
            raise ValueError("Benchmark returned None score")
            
        print(f"SCORE:{{score}}")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"ERROR:{{str(e)}}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run()
"""
            
            (temp_path / "runner.py").write_text(runner_script)
            
            try:
                logger.info(f"Starting container with image {image_tag}")
                
                abs_temp_path = str(temp_path.absolute())
                logger.info(f"Files to be copied: {os.listdir(abs_temp_path)}")
                
                # Create and start container
                container = docker_client.containers.run(
                    image=image_tag,
                    command="sleep infinity",
                    working_dir='/app',
                    environment={
                        "PYTHONPATH": "/app",
                        "PYTHONUNBUFFERED": "1"
                    },
                    detach=True
                )
                
                try:
                    # Create /app directory and copy files
                    container.exec_run("mkdir -p /app")
                    
                    # Copy files to container
                    for file_name in os.listdir(temp_path):
                        file_path = temp_path / file_name
                        logger.info(f"Copying {file_name} into container...")
                        
                        tar_stream = BytesIO()
                        with tarfile.open(fileobj=tar_stream, mode='w') as tar:
                            tar.add(str(file_path), arcname=file_name)
                        tar_stream.seek(0)
                        
                        container.put_archive("/app", tar_stream)
                    
                    # Verify files
                    result = container.exec_run(["ls", "-la", "/app"])
                    logger.info(f"Container directory after copy: {result.output.decode()}")
                    
                    # Run benchmark
                    result = container.exec_run(
                        ["python", "/app/runner.py"],
                        stream=True
                    )
                    
                    # Process output
                    score = None
                    processed_rows = 0
                    logger.info("Starting to process container output...")
                    
                    for line in result.output:
                        line = line.decode('utf-8').strip()
                        logger.debug(f"Raw output line: {repr(line)}")
                        
                        if "\r" in line or "%" in line or "it/s" in line:
                            continue
                        
                        if line.startswith('PROGRESS:'):
                            try:
                                rows = int(line.replace('PROGRESS:', '').strip())
                                processed_rows = rows
                                if progress_callback:
                                    progress_callback(rows)
                                logger.debug(f"Progress update: {rows} rows processed")
                            except ValueError as e:
                                logger.warning(f"Failed to parse progress value: {e}")
                        
                        elif line.startswith('SCORE:'):
                            try:
                                score_str = line.replace('SCORE:', '').strip()
                                score = float(score_str)
                                logger.info(f"Successfully parsed score: {score}")
                                if progress_callback:
                                    progress_callback(processed_rows, score)
                            except ValueError as e:
                                logger.error(f"Failed to parse score value '{score_str}': {e}")
                        
                        elif line.startswith('ERROR:'):
                            error_msg = line.replace('ERROR:', '').strip()
                            raise Exception(error_msg)
                            
                    if score is None:
                        raise ValueError("Benchmark did not produce a score")
                    
                    logger.info(f"Successfully computed score: {score}")
                    return score
                    
                finally:
                    try:
                        container.stop()
                        container.remove(force=True)
                    except Exception as e:
                        logger.warning(f"Failed to cleanup container: {e}")
                        
            except Exception as e:
                logger.error(f"Benchmark execution failed: {e}")
                raise
                
    except Exception as e:
        logger.error(f"Benchmark execution failed: {e}")
        raise RuntimeError(f"Benchmark execution failed: {e}")