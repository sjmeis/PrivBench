import docker
import tempfile
import os
from pathlib import Path
import json
from celery import shared_task
import logging
import shutil

logger = logging.getLogger(__name__)

class ModuleManager:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.base_image = "python:3.9-slim"
        
    def create_dockerfile(self, requirements_path):
        """Create a Dockerfile for the module container"""
        return f"""
        FROM {self.base_image}
        WORKDIR /app
        COPY requirements.txt /app/requirements.txt
        RUN pip install --no-cache-dir -r requirements.txt
        COPY . /app
        """

    def build_module_container(self, module_id, module_path, module_name, requirements_path):
        """Build a Docker container for the module"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            module_dest = temp_path / f"{module_name}.py"
            requirements_dest = temp_path / "requirements.txt"
            
            # Copy and log module file
            shutil.copy2(module_path, module_dest)
            logger.debug(f"Module file copied to: {module_dest}")
            logger.debug(f"Module contents: {module_dest.read_text()}")

            # Copy files from benchmarks folder
            benchmarks_path = Path("/benchmarks")  # This is the mounted path in the container
            if benchmarks_path.exists():
                # Create a benchmarks directory in the temp folder
                benchmark_dest = temp_path / "benchmarks"
                benchmark_dest.mkdir(exist_ok=True)
                
                # Copy all files from benchmarks directory
                for benchmark_file in benchmarks_path.glob("*"):
                    if benchmark_file.is_file():
                        shutil.copy2(benchmark_file, benchmark_dest / benchmark_file.name)
                        logger.debug(f"Benchmark file copied: {benchmark_file.name}")
            
            logger.debug(f"Temp directory contents: {list(temp_path.glob('**/*'))}")
            
            if requirements_path:
                shutil.copy2(requirements_path, requirements_dest)
                logger.debug(f"Requirements contents: {requirements_dest.read_text()}")
            else:
                requirements_dest.write_text("")
            
            dockerfile_content = self.create_dockerfile(requirements_dest.name)
            (temp_path / "Dockerfile").write_text(dockerfile_content)
            
            logger.debug(f"Temp directory contents: {list(temp_path.glob('*'))}")
            
            #tag = f"module-{module_id}"
            tag = f"module-{module_name.lower()}"
            _, build_logs = self.docker_client.images.build(
                path=str(temp_path),
                tag=tag,
                rm=True
            )
            
            # Log build output
            for log in build_logs:
                if 'stream' in log:
                    logger.debug(f"Build log: {log['stream'].strip()}")
                    
            return tag

    def test_module(self, image_tag, module_name):
        """Test if the module can be loaded and instantiated"""
        test_script = f"""
import importlib.util
import sys
import json
from pathlib import Path
import traceback

def test_module():
    try:
        module_path = Path('/app/{module_name}.py')
        
        # Debug output
        print(f"Debug: Current directory contents: {{list(Path('/app').glob('*'))}}")
        print(f"Debug: Module path exists: {{module_path.exists()}}")
        
        if not module_path.exists():
            return f"Module file not found at {{module_path}}"
        
        print(f"Debug: Module contents: {{module_path.read_text()}}")
        
        spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
        if spec is None:
            return "Failed to create module specification"
            
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_path.stem] = module
        spec.loader.exec_module(module)
        
        # Debug output
        print(f"Debug: Module dir contents: {{dir(module)}}")
        
        cls = getattr(module, '{module_name}')
        instance = cls()
        return True
    except Exception as e:
        return f"{{str(e)}}\\nTraceback: {{traceback.format_exc()}}"

try:
    result = test_module()
    print(json.dumps({{"success": result == True, "error": str(result) if result != True else None}}))
except Exception as e:
    print(json.dumps({{"success": False, "error": f"Test script error: {{str(e)}}\\nTraceback: {{traceback.format_exc()}}"}}))
"""
        try:
            container = self.docker_client.containers.run(
                image_tag,
                command=["python", "-c", test_script],
                remove=True
            )
            
            output = container.decode('utf-8')
            logger.debug(f"Container output: {output}")
            
            # Try to parse JSON from the last line of output
            try:
                output_lines = output.strip().split('\n')
                json_line = output_lines[-1]
                return json.loads(json_line)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from output: {output}")
                return {
                    "success": False,
                    "error": f"Invalid container output: {output}"
                }
                
        except docker.errors.ContainerError as e:
            logger.error(f"Container error: {str(e)}")
            return {"success": False, "error": f"Container error: {str(e)}"}
        except Exception as e:
            logger.error(f"Container execution failed: {str(e)}")
            return {"success": False, "error": str(e)}