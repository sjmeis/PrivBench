import subprocess
import sys
import venv
import os
from celery import shared_task
from pathlib import Path
import logging
from contextlib import contextmanager
from app.utils.module_manager import ModuleManager

logger = logging.getLogger(__name__)

'''@contextmanager
def virtual_environment(venv_path):
    """Context manager for operating within a virtual environment"""
    venv_path = Path(venv_path)
    # Recreate virtual environment to avoid conflicts
    if venv_path.exists():
        import shutil
        shutil.rmtree(venv_path)
    venv.create(venv_path, with_pip=True)
    
    # Get path to activation script
    if sys.platform == 'win32':
        activate_script = venv_path / 'Scripts' / 'activate.bat'
    else:
        activate_script = venv_path / 'bin' / 'activate'
    
    # Save current PATH
    old_path = os.environ.get('PATH', '')
    
    try:
        # Add venv's bin directory to PATH
        bin_dir = str(venv_path / ('Scripts' if sys.platform == 'win32' else 'bin'))
        os.environ['PATH'] = f"{bin_dir}{os.pathsep}{old_path}"
        
        # Modify sys.prefix
        old_prefix = sys.prefix
        sys.prefix = str(venv_path)
        
        yield
    finally:
        # Restore old PATH and sys.prefix
        os.environ['PATH'] = old_path
        sys.prefix = old_prefix

@shared_task(bind=True)
def install_requirements_and_load_module(self, module_id, module_name, module_path, requirements_path):
    """
    Celery task to install requirements and load a module in a virtual environment
    """
    try:
        # Get venv path from environment variable
        base_venv_path = os.environ.get('MODULE_VENVS_PATH', '/modules/venvs')
        venv_path = Path(base_venv_path) / f"module_{module_id}"
        
        # Ensure parent directory exists with correct permissions
        venv_path.parent.mkdir(exist_ok=True)
        
        logger.info(f"Creating virtual environment at {venv_path}")
        
        with virtual_environment(venv_path):
            # Install requirements if provided
            if requirements_path:
                logger.info(f"Installing requirements from {requirements_path}")
                try:
                    result = subprocess.run(
                        [f"{venv_path}/bin/pip", "install", "--ignore-installed", "--no-cache-dir", "-r", requirements_path, "--timeout", "300"],
                        check=True,
                        capture_output=True,
                        text=True
                    )
                    logger.info(f"Requirements installed successfully. Output: {result.stdout}")
                except subprocess.CalledProcessError as e:
                    logger.error(f"Failed to install requirements: {e.stdout}\n{e.stderr}")
                    raise
            
            site_packages = next(venv_path.glob('lib/python*/site-packages'))
            sys.path.insert(0, str(site_packages))

            logger.info(f"sys.path: {sys.path}")
            logger.info(f"os.environ['PATH']: {os.environ['PATH']}")


            # Try to load the module
            try:
                from app.utils.module_loader import load_benchmark_module
                module_class = load_benchmark_module(module_path, module_name)
                
                # Test instantiation
                instance = module_class()
                
                return {
                    "status": "success",
                    "message": "Module installed and loaded successfully",
                    "module_id": module_id,
                    "venv_path": str(venv_path)
                }
                
            except Exception as e:
                logger.error(f"Failed to load module: {str(e)}")
                raise
                
    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "module_id": module_id
        }'''

@shared_task(bind=True)
def install_and_load_module(self, module_id, module_name, module_path, requirements_path):
    """Celery task to install and load a module"""
    try:
        logger.info(f"Starting module installation for {module_name}")
        logger.debug(f"Module path: {module_path}")
        logger.debug(f"Requirements path: {requirements_path}")
        
        if not os.path.exists(module_path):
            raise FileNotFoundError(f"Module file not found at {module_path}")
            
        # Log module contents
        with open(module_path, 'r') as f:
            logger.debug(f"Module contents:\n{f.read()}")
            
        manager = ModuleManager()
        
        image_tag = manager.build_module_container(
            module_id=module_id,
            module_path=module_path,
            module_name=module_name,
            requirements_path=requirements_path
        )
        
        test_result = manager.test_module(image_tag, module_name)
        
        if test_result["success"]:
            logger.info(f"Module {module_name} installed successfully")
            return {
                "status": "success",
                "message": "Module installed and loaded successfully",
                "module_id": module_id,
                "image_tag": image_tag
            }
        else:
            error_msg = f"Module test failed: {test_result['error']}"
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "module_id": module_id
            }
            
    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "module_id": module_id
        }