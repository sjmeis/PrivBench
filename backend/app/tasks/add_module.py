# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import os
import shutil
from celery import shared_task
import logging
from app.utils.module_manager import ModuleManager
from app.utils.container_manager import module_container_name

logger = logging.getLogger(__name__)


def _gpu_available():
    return shutil.which("nvidia-smi") is not None or os.getenv("HAS_GPU") == "true"


@shared_task(bind=True)
def install_and_load_module(
    self,
    module_id,
    module_name,
    module_path,
    requirements_path,
    is_new_module=False,
    restart_container=False,
    use_gpu=False
):
    """Celery task to install and load a module."""
    container_name = module_container_name(module_name)
    try:
        from app.utils.container_manager import container_manager

        # Simple device handling
        if use_gpu == True:
            if not _gpu_available():
                logger.error(
                    f"GPU requested for {module_name} but no Nvidia driver found."
                )
                return {
                    "status": "error",
                    "message": "GPU requested but not available (nvidia-smi not found)",
                    "module_id": module_id,
                }
            else:
                logger.info(
                    f"GPU available for module {module_name}. Building with GPU support."
                )

        logger.info(f"Starting module installation for {module_name}")
        logger.debug(f"Module path: {module_path}")
        logger.debug(f"Requirements path: {requirements_path}")

        if not os.path.exists(module_path):
            raise FileNotFoundError(f"Module file not found at {module_path}")

        # Log module contents
        # with open(module_path, "r") as f:
        #     logger.debug(f"Module contents:\n{f.read()}")

        manager = ModuleManager()
        image_tag = manager.build_module_container(
            module_path=module_path,
            module_name=module_name,
            requirements_path=requirements_path,
            use_gpu=use_gpu
        )

        test_result = manager.test_module(
            image_tag, module_name, module_path=module_path, use_gpu=use_gpu
        )

        if test_result["success"]:
            logger.info(f"Module {module_name} image built and tested successfully")

            should_start = is_new_module or restart_container

            if should_start:
                logger.info(
                    f"Flag 'is_new_module' is set. Attempting to start container for module: {module_name}"
                )
                from app.models import BenchmarkModule

                module = BenchmarkModule.query.get(module_id)
                if module:
                    container = container_manager.start_module_container(module)
                    if container:
                        logger.info(
                            f"Successfully started container for module: {module_name}"
                        )
                        return {
                            "status": "success",
                            "message": f"Module {module_name} installed and container started successfully",
                            "module_id": module_id,
                            "image_tag": image_tag,
                            "container_name": container_name,
                        }
                    else:
                        error_msg = f"Module {module_name} installed but container failed to start."
                        logger.warning(error_msg)
                        container_manager._mark_installation_complete(container_name)
                        return {
                            "status": "warning",
                            "message": error_msg,
                            "module_id": module_id,
                            "image_tag": image_tag,
                        }
                else:
                    error_msg = (
                        f"Module {module_id} not found in database after installation."
                    )
                    logger.error(error_msg)
                    container_manager._mark_installation_complete(container_name)
                    return {
                        "status": "error",
                        "message": error_msg,
                        "module_id": module_id,
                    }
            else:
                logger.info(
                    f"Container for {module_name} not started as per flag. Installation complete."
                )
                container_manager._mark_installation_complete(container_name)
                return {
                    "status": "success",
                    "message": f"Module {module_name} image built successfully. Container not started.",
                    "module_id": module_id,
                    "image_tag": image_tag,
                }
        else:
            error_msg = f"Module test failed: {test_result['error']}"
            logger.error(error_msg)
            container_manager._mark_installation_complete(container_name)
            return {"status": "error", "message": error_msg, "module_id": module_id}

    except Exception as e:
        logger.error(f"Task failed for module {module_name}: {str(e)}", exc_info=True)
        try:
            from app.utils.container_manager import container_manager

            container_manager._mark_installation_complete(container_name)
        except Exception as cleanup_error:
            logger.error(
                f"Failed to cleanup installing flag for {container_name}: {cleanup_error}"
            )
        return {"status": "error", "message": str(e), "module_id": module_id}
