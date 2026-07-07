from celery.utils.log import get_task_logger
import tempfile
from pathlib import Path
import shutil
import tarfile
from io import BytesIO
import os
import time
import docker

from ..utils.container_manager import container_manager

logger = get_task_logger(__name__)

def run_benchmark(
    module_path,
    module_id,
    module_name,
    dataset_path,
    priv_dataset_path,
    dataset_identifier,
    progress_callback=None,
):
    logger.info(f"Starting benchmark container step targeting dataset: {dataset_identifier}")

    try:
        container = wait_for_container_with_installation_check(module_name, progress_callback)
        if not container:
            raise Exception(f"Container not available for module {module_name}")

        module_stem = Path(module_path).stem

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            shutil.copy2(module_path, temp_path / f"{module_stem}.py")
            shutil.copy2(dataset_path, temp_path / "dataset.csv")
            shutil.copy2(priv_dataset_path, temp_path / "privatized_dataset.csv")

            host_benchmarks = Path("/app/benchmarks")
            if host_benchmarks.exists():
                shutil.copytree(host_benchmarks, temp_path / "benchmarks", dirs_exist_ok=True)

            hf_token = os.getenv("HF_TOKEN", "")

            runner_script = f"""
import pandas as pd
import sys
import json
import importlib.util
import types
import os
from pathlib import Path

sys.path.insert(0, '/app')

os.environ["HF_TOKEN"] = "{hf_token}"

if 'modules' not in sys.modules:
    m = types.ModuleType('modules')
    m.__path__ = ['/app']
    sys.modules['modules'] = m

benchmarks_init = Path('/app/benchmarks/__init__.py')
if not benchmarks_init.exists():
    benchmarks_init.touch()

def run():
    try:
        module_path = Path('/app/{module_stem}.py')
        spec = importlib.util.spec_from_file_location('{module_stem}', module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules['{module_stem}'] = module
        spec.loader.exec_module(module)

        benchmark_class = getattr(module, '{module_stem}')
        
        # FIX: Hand down empty properties instead of strict names so your legacy models don't crash 
        benchmark_instance = benchmark_class()
        
        dataset = pd.read_csv('/app/dataset.csv')
        privatized_dataset = pd.read_csv('/app/privatized_dataset.csv')
        
        if dataset.shape != privatized_dataset.shape:
            raise ValueError(f"Dataset shapes don't match: {{dataset.shape}} vs {{privatized_dataset.shape}}")
        
        if 'text' not in dataset.columns or 'text' not in privatized_dataset.columns:
            raise ValueError("'text' column is missing in one of the datasets")
        
        dataset_text = dataset['text'].to_list()
        privatized_dataset_text = privatized_dataset['text'].to_list()
            
        def progress_wrapper(processed_rows):
            if processed_rows is not None:
                print(f"PROGRESS:{{processed_rows}}")
                sys.stdout.flush()
        
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
            logger.info(f"Using existing container for module {module_name}")
            (temp_path / "runner.py").write_text(runner_script)

            for file_name in os.listdir(temp_path):
                file_path = temp_path / file_name
                logger.info(f"Copying {file_name} into container...")

                tar_stream = BytesIO()
                with tarfile.open(fileobj=tar_stream, mode="w") as tar:
                    tar.add(str(file_path), arcname=file_name)
                tar_stream.seek(0)

                container.put_archive("/app", tar_stream)
            
            client = docker.from_env()
            exec_instance = client.api.exec_create(container.id, ["python3", "/app/runner.py"])
            output_stream = client.api.exec_start(exec_instance['Id'], stream=True)
            
            score = None
            processed_rows = 0           
            for chunk in output_stream:
                raw = chunk.decode("utf-8")
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or "\r" in line or "%" in line or "it/s" in line:
                        continue
                    if line.startswith("PROGRESS:"):
                        try:
                            rows = int(line.replace("PROGRESS:", "").strip())
                            processed_rows = rows
                            if progress_callback:
                                progress_callback(rows)
                        except ValueError:
                            pass
                    if "SCORE:" in line:
                        try:
                            score_part = line[line.find("SCORE:") + 6 :]
                            score = float(score_part.strip())
                        except ValueError:
                            continue
                    elif "ERROR:" in line or line.startswith("Traceback"):
                        raise Exception(line.replace("ERROR:", "").strip())

            exit_status = client.api.exec_inspect(exec_instance['Id'])['ExitCode']
            if exit_status != 0:
                raise Exception(f"Benchmark run exited with code {exit_status}")
                
            return score
    except Exception as e:
        logger.error(f"Execution handling step failed: {e}")
        raise


def wait_for_container_with_installation_check(
    module_name, progress_callback=None, max_wait_time=300, check_interval=3
):
    logger.info(f"Waiting for container for module {module_name}")
    start_time = time.time()
    installation_detected = False

    while time.time() - start_time < max_wait_time:
        container = container_manager.get_container(module_name)
        if container:
            logger.info(f"Container for module {module_name} is ready")
            return container

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
                        installation_detected = True
            except Exception as e:
                logger.warning(f"Failed to start container for {module_name}: {e}")

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