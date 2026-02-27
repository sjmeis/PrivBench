from celery.utils.log import get_task_logger
import tempfile
from pathlib import Path
import shutil
import tarfile
from io import BytesIO
import os
import time

from ..utils.container_manager import container_manager

logger = get_task_logger(__name__)


def run_benchmark(
    module_path,
    module_id,
    module_name,
    dataset_path,
    priv_dataset_path,
    progress_callback=None,
):
    """
    Run a benchmark module in a Docker container.
    The function maintains the same interface but executes the module in a container.
    """
    logger.info(f"Starting benchmark execution for module {module_name}")

    try:
        # Check if container is installing and wait for it to become ready
        container = wait_for_container_with_installation_check(
            module_name, progress_callback
        )
        if not container:
            logger.error(
                f"Container for module {module_name} failed to start within timeout"
            )
            raise Exception(f"Container not available for module {module_name}")

        module_stem = Path(module_path).stem

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Copy required files
            shutil.copy2(module_path, temp_path / f"{module_stem}.py")
            shutil.copy2(dataset_path, temp_path / "dataset.csv")
            shutil.copy2(priv_dataset_path, temp_path / "privatized_dataset.csv")

            host_benchmarks = Path("/app/benchmarks")
            if host_benchmarks.exists():
                shutil.copytree(host_benchmarks, temp_path / "benchmarks", dirs_exist_ok=True)

            # Create runner script with simple progress output
            runner_script = f"""
import pandas as pd
import sys
import json
import importlib.util
import types
from pathlib import Path

sys.path.insert(0, '/app')

if 'modules' not in sys.modules:
    m = types.ModuleType('modules')
    m.__path__ = ['/app']
    sys.modules['modules'] = m

benchmarks_init = Path('/app/benchmarks/__init__.py')
if not benchmarks_init.exists():
    benchmarks_init.touch()

def run():
    try:
        # Load module
        module_path = Path('/app/{module_stem}.py')
        spec = importlib.util.spec_from_file_location('{module_stem}', module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules['{module_stem}'] = module
        spec.loader.exec_module(module)

        # Create benchmark instance
        benchmark_class = getattr(module, '{module_stem}')
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
        
    except Exception as e:
        print(f"ERROR:{{str(e)}}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run()
"""

            (temp_path / "runner.py").write_text(runner_script)

            try:
                logger.info(f"Using existing container for module {module_name}")

                # Copy files to container
                for file_name in os.listdir(temp_path):
                    file_path = temp_path / file_name
                    logger.info(f"Copying {file_name} into container...")

                    tar_stream = BytesIO()
                    with tarfile.open(fileobj=tar_stream, mode="w") as tar:
                        tar.add(str(file_path), arcname=file_name)
                    tar_stream.seek(0)

                    container.put_archive("/app", tar_stream)

                # Verify files
                result = container.exec_run(["ls", "-la", "/app"])
                logger.info(f"Container directory after copy: {result.output.decode()}")
                # Run benchmark
                result = container.exec_run(["python3", "/app/runner.py"], stream=True)

                # Process output
                score = None
                processed_rows = 0
                logger.info("Starting to process container output...")
                for chunk in result.output:
                    raw = chunk.decode("utf-8")
                    logger.debug(f"Raw output chunk: {repr(raw)}")

                    # Split chunk into individual lines
                    for line in raw.splitlines():
                        line = line.strip()
                        if not line:
                            continue

                        # Skip tqdm progress bar lines
                        if "\r" in line or "%" in line or "it/s" in line:
                            continue

                        if line.startswith("PROGRESS:"):
                            try:
                                rows = int(line.replace("PROGRESS:", "").strip())
                                processed_rows = rows
                                if progress_callback:
                                    progress_callback(rows)
                                logger.debug(f"Progress update: {rows} rows processed")
                            except ValueError as e:
                                logger.warning(f"Failed to parse progress value: {e}")

                        if "SCORE:" in line:
                            logger.info(f"Found score line: {repr(line)}")
                            try:
                                score_part = line[line.find("SCORE:") + 6 :]
                                score = float(score_part.strip())
                                logger.info(f"Successfully parsed score: {score}")
                                if progress_callback:
                                    progress_callback(processed_rows, score)
                            except ValueError as e:
                                logger.error(
                                    f"Failed to parse score: {e} from line: {repr(line)}"
                                )
                                continue

                        elif line.startswith("ERROR:"):
                            error_msg = line.replace("ERROR:", "").strip()
                            raise Exception(error_msg)

                exit_code = result.exit_code
                if exit_code is not None and exit_code != 0:
                    raise Exception(f"Benchmark failed with exit code {exit_code}")

                if score is None:
                    raise ValueError("Benchmark did not produce a score")

                logger.info(f"Successfully computed score: {score}")
                return score

            except Exception as e:
                logger.error(f"Benchmark execution failed: {e}")
                raise

    except Exception as e:
        logger.error(f"Benchmark execution failed: {e}")
        raise RuntimeError(f"Benchmark execution failed: {e}")


def wait_for_container_with_installation_check(
    module_name, progress_callback=None, max_wait_time=300, check_interval=3
):
    """
    Wait for a container to become available, checking if installation is in progress.
    This allows starting evaluation tasks even while the container is still being installed.

    Args:
        module_name: Name of the module
        progress_callback: Callback function to update progress
        max_wait_time: Maximum time to wait in seconds (default: 300 seconds = 5 minutes)
        check_interval: How often to check in seconds (default: 3 seconds)

    Returns:
        Container object if available, None if timeout
    """
    logger.info(f"Waiting for container for module {module_name}")
    start_time = time.time()
    installation_detected = False

    while time.time() - start_time < max_wait_time:
        # Try to get existing container
        container = container_manager.get_container(module_name)
        if container:
            logger.info(f"Container for module {module_name} is ready")
            return container

        # Check if installation is in progress
        if container_manager.is_container_installing(module_name):
            installation_detected = True
            elapsed = int(time.time() - start_time)
            remaining = max_wait_time - elapsed
            if progress_callback:
                progress_callback(
                    0,
                    None,
                    f"Container is being installed... ({elapsed}s elapsed, {remaining}s remaining)",
                )
            logger.info(
                f"Container installation detected for {module_name}, continuing to wait..."
            )
        else:
            # Try to start container if it doesn't exist and installation not detected
            try:
                from ..models import BenchmarkModule

                module = BenchmarkModule.query.filter_by(
                    name=module_name, is_active=True
                ).first()
                if module:
                    logger.info(
                        f"Attempting to start container for module {module_name}"
                    )
                    container = container_manager.start_module_container(module)
                    if container:
                        logger.info(
                            f"Successfully started container for module {module_name}"
                        )
                        return container
                    else:
                        # Container start was initiated, mark as installing
                        installation_detected = True
            except Exception as e:
                logger.warning(f"Failed to start container for {module_name}: {e}")

        # Update progress with appropriate message
        elapsed = int(time.time() - start_time)
        remaining = max_wait_time - elapsed

        if installation_detected:
            status_msg = f"Container installation in progress... ({elapsed}s elapsed, {remaining}s remaining)"
        else:
            status_msg = f"Waiting for container to become available... ({elapsed}s elapsed, {remaining}s remaining)"

        if progress_callback:
            progress_callback(0, None, status_msg)

        logger.debug(
            f"Container not ready for {module_name}, waiting {check_interval} seconds..."
        )
        time.sleep(check_interval)

    logger.error(f"Timeout waiting for container for module {module_name}")
    return None
