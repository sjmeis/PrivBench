import os
from celery import shared_task
import logging
from app.utils.module_manager import ModuleManager

logger = logging.getLogger(__name__)

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