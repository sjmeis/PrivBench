import docker
import tempfile
from pathlib import Path
import json
import logging
import shutil
from docker.types import DeviceRequest
import os

logger = logging.getLogger(__name__)


class ModuleManager:
    def __init__(self):
        self.docker_client = docker.from_env()
        # self.base_image_cpu = "python:3.9-slim"
        # CUDA runtime; requires host NVIDIA driver + toolkit
        # self.base_image_gpu = "nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04"
        self.base_image_cpu = "privbench-base-cpu:latest"
        self.base_image_gpu = "privbench-base-gpu:latest"

    def create_dockerfile(self, requirements_filename, use_gpu=False):
        """Create a Dockerfile for the module container"""
        base = self.base_image_gpu if use_gpu else self.base_image_cpu
        
        return f"""
        FROM {base}
        WORKDIR /app
        RUN ln -s /usr/bin/python3 /usr/bin/python || true 
        ENV PYTHONPATH=/app
        RUN pip install --no-cache-dir pandas
        COPY {requirements_filename} /app/requirements.txt
        RUN pip install --no-cache-dir -r requirements.txt || true
        COPY . /app
        RUN ln -s /app /app/modules || true && touch /app/__init__.py
        """

    def build_module_container(
        self, module_path, module_name, requirements_path, use_gpu=False
    ):
        """Build a Docker container for the module"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            module_dest = temp_path / f"{module_name}.py"
            requirements_dest = temp_path / "requirements.txt"

            # Copy and log module file
            source_modules_dir = Path(module_path).parent
            # for file in source_modules_dir.iterdir():
            #     if file.is_file():
            #         shutil.copy2(file, temp_path / file.name)
            #         logger.debug(f"Copied to context: {file.name}")
            # logger.debug(f"Module file copied to: {module_dest}")
            # logger.debug(f"Module contents: {module_dest.read_text()}")
            try:
                shutil.copytree(source_modules_dir, temp_path, dirs_exist_ok=True)
                logger.info(f"Successfully mirrored {source_modules_dir} to build context")
            except Exception as e:
                logger.error(f"Failed to copy module files: {str(e)}")
                raise

            # Verification: Force a log of what is about to be built
            context_files = os.listdir(temp_path)
            logger.info(f"Build context for {module_name} contains: {context_files}")

            if "authorship_labels.json" not in context_files:
                logger.error(f"FATAL: authorship_labels.json missing from context! Source: {source_modules_dir}")

            # Copy files from benchmarks folder
            benchmarks_path = Path(
                "/app/benchmarks"
            )  # This is the mounted path in the container
            logger.debug(f"Benchmarks path: {benchmarks_path}")
            if benchmarks_path.exists():
                logger.debug(f"Source benchmarks directory exists: {benchmarks_path}")
                logger.debug(
                    f"Source benchmarks contents: {list(benchmarks_path.glob('*'))}"
                )
                # Create a benchmarks directory in the temp folder
                benchmark_dest = temp_path / "benchmarks"
                benchmark_dest.mkdir(exist_ok=True)

                # Copy all files from benchmarks directory
                for benchmark_file in benchmarks_path.glob("*"):
                    if benchmark_file.is_file():
                        shutil.copy2(
                            benchmark_file, benchmark_dest / benchmark_file.name
                        )
                        logger.debug(f"Benchmark file copied: {benchmark_file.name}")

            logger.debug(f"Temp directory contents: {list(temp_path.glob('**/*'))}")

            if requirements_path:
                shutil.copy2(requirements_path, requirements_dest)
                logger.debug(f"Requirements contents: {requirements_dest.read_text()}")
            else:
                requirements_dest.write_text("")

            dockerfile_content = self.create_dockerfile(
                requirements_dest.name, use_gpu=use_gpu
            )
            (temp_path / "Dockerfile").write_text(dockerfile_content)

            logger.debug(f"Temp directory contents: {list(temp_path.glob('*'))}")

            tag = f"module-{module_name.lower()}"
            _, build_logs = self.docker_client.images.build(
                path=str(temp_path), tag=tag, rm=True, pull=False, nocache=True
            )

            # Log build output
            for log in build_logs:
                if "stream" in log:
                    logger.debug(f"Build log: {log['stream'].strip()}")

            self.docker_client.images.prune(filters={"dangling": True})

            return tag

    def test_module(self, image_tag, module_name, use_gpu=False):
        """Test if the module can be loaded and instantiated"""

        # Update: We force the PYTHONPATH inside the test script too
        test_script = f"""
import sys
import json
import traceback
from pathlib import Path
sys.path.insert(0, '/app')

def test_module():
    try:
        import importlib.util
        module_path = Path('/app/{module_name}.py')
        
        if not module_path.exists():
            return f"Module file not found at {{module_path}}"
        
        spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_path.stem] = module
        spec.loader.exec_module(module)
        
        cls = getattr(module, '{module_name}')
        instance = cls()
        
        # Optional: Verify GPU if expected
        if {use_gpu}:
            import torch
            if not torch.cuda.is_available():
                return "GPU requested but torch.cuda.is_available() is False"
                
        return True
    except Exception as e:
        return f"{{str(e)}}\\nTraceback: {{traceback.format_exc()}}"

result = test_module()
print(json.dumps({{"success": result == True, "error": str(result) if result != True else None}}))
"""
        try:
            device_requests = []
            if use_gpu:
                device_requests = [DeviceRequest(count=-1, capabilities=[["gpu"]])]

            container_output = self.docker_client.containers.run(
                image_tag,
                command=["python3", "-c", test_script],
                remove=True,
                network="privbench_default",
                device_requests=device_requests,
                stdout=True,
                stderr=True,
            )

            output = container_output.decode("utf-8")
            logger.debug(f"Container output: {output}")

            # Try to parse JSON from the last line of output
            try:
                output_lines = output.strip().split("\n")
                json_line = output_lines[-1]
                return json.loads(json_line)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from output: {output}")
                return {
                    "success": False,
                    "error": f"Invalid container output: {output}",
                }

        except docker.errors.ContainerError as e:
            logger.error(f"Container error: {str(e)}")
            return {"success": False, "error": f"Container error: {str(e)}"}
        except Exception as e:
            logger.error(f"Container execution failed: {str(e)}")
            return {"success": False, "error": str(e)}
