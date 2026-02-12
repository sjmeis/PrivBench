import docker
from docker.types import DeviceRequest
import logging
import threading
from ..models import BenchmarkModule

logger = logging.getLogger(__name__)


class ContainerManager:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.running_containers = {}
        self.installing_containers = set()  # Track containers being installed
        self._installation_lock = threading.Lock()
        self._discover_existing_containers()

    def _discover_existing_containers(self):
        """Discover existing module containers and add them to tracking"""
        try:
            # Find all containers with names starting with "module-container-"
            all_containers = self.docker_client.containers.list(
                all=True, filters={"name": "module-container-"}
            )

            for container in all_containers:
                if container.name.startswith("module-container-"):
                    container.reload()
                    if container.status == "running":
                        logger.info(
                            f"Discovered existing running container: {container.name}"
                        )
                        self.running_containers[container.name] = container
                    else:
                        logger.info(
                            f"Discovered existing stopped container: {container.name}, removing it"
                        )
                        container.remove(force=True)

        except Exception as e:
            logger.warning(f"Error discovering existing containers: {e}")

    def is_container_installing(self, module_name):
        """Check if a container is currently being installed"""
        container_name = f"module-container-{module_name.lower()}"
        with self._installation_lock:
            return container_name in self.installing_containers

    def _mark_installing(self, container_name):
        """Mark a container as being installed"""
        with self._installation_lock:
            self.installing_containers.add(container_name)
            logger.info(f"Marked container {container_name} as installing")

    def _mark_installation_complete(self, container_name):
        """Mark a container installation as complete"""
        with self._installation_lock:
            self.installing_containers.discard(container_name)
            logger.info(f"Marked container {container_name} installation as complete")

    def start_all_module_containers(self):
        """Start containers for all active benchmark modules"""
        try:
            active_modules = BenchmarkModule.query.filter_by(is_active=True).all()

            for module in active_modules:
                self.start_module_container(module)

        except Exception as e:
            error_msg = f"Error starting module containers: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    def start_module_container(self, module):
        """Start a container for a specific module"""
        try:
            image_tag = f"module-{module.name.lower()}"
            container_name = f"module-container-{module.name.lower()}"

            # Check if already installing
            if self.is_container_installing(module.name):
                logger.info(f"Container {container_name} is already being installed")
                return None

            # Check if container already exists and is running (in our tracking)
            if container_name in self.running_containers:
                container = self.running_containers[container_name]
                try:
                    container.reload()
                    if container.status == "running":
                        logger.info(f"Container {container_name} already running")
                        return container
                    else:
                        # Remove stopped container
                        container.remove(force=True)
                        del self.running_containers[container_name]
                except docker.errors.NotFound:
                    # Container was removed externally
                    del self.running_containers[container_name]

            # Check for existing containers in Docker (not in our tracking)
            try:
                existing_container = self.docker_client.containers.get(container_name)
                logger.info(f"Found existing container {container_name} in Docker")
                existing_container.reload()

                if existing_container.status == "running":
                    logger.info(
                        f"Existing container {container_name} is running, adding to tracking"
                    )
                    self.running_containers[container_name] = existing_container
                    return existing_container
                else:
                    logger.info(
                        f"Existing container {container_name} is stopped, removing it"
                    )
                    existing_container.remove(force=True)

            except docker.errors.NotFound:
                # No existing container with this name, which is fine
                logger.debug(f"No existing container found with name {container_name}")

            # Mark as installing before starting the installation process
            self._mark_installing(container_name)

            try:
                device_requests = []
                if module.use_gpu:
                    logger.info(f"Requesting GPU access for {container_name}")
                    device_requests = [
                        docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
                    ]

                # Check if image exists
                try:
                    self.docker_client.images.get(image_tag)
                except docker.errors.ImageNotFound:
                    error_msg = (
                        f"Docker image {image_tag} not found for module {module.name}"
                    )
                    logger.error(error_msg)
                    self._mark_installation_complete(container_name)
                    raise docker.errors.ImageNotFound(error_msg)

                # Start new container
                container = self.docker_client.containers.run(
                    image=image_tag,
                    name=container_name,
                    command="sleep infinity",
                    working_dir="/app",
                    environment={"PYTHONPATH": "/app", "PYTHONUNBUFFERED": "1", "NVIDIA_VISIBLE_DEVICES": "all"},
                    device_requests=device_requests,
                    detach=True,
                    remove=False,
                )

                # Create /app directory in container
                container.exec_run("mkdir -p /app")

                self.running_containers[container_name] = container
                logger.info(
                    f"Started container {container_name} for module {module.name}"
                )

                # Mark installation as complete
                self._mark_installation_complete(container_name)

                return container

            except Exception as e:
                # Mark installation as complete even on failure
                self._mark_installation_complete(container_name)
                raise e

        except Exception as e:
            logger.error(f"Error starting container for module {module.name}: {e}")
            return None

    def get_container(self, module_name):
        """Get running container for a module"""
        container_name = f"module-container-{module_name.lower()}"

        # First check our local tracking
        container = self.running_containers.get(container_name)
        if container:
            try:
                container.reload()
                if container.status == "running":
                    return container
                else:
                    # Container stopped, remove from our tracking
                    del self.running_containers[container_name]
            except docker.errors.NotFound:
                # Container was removed externally
                del self.running_containers[container_name]

        # If not in our tracking, check Docker directly
        try:
            existing_container = self.docker_client.containers.get(container_name)
            existing_container.reload()

            if existing_container.status == "running":
                logger.info(
                    f"Found untracked running container {container_name}, adding to tracking"
                )
                self.running_containers[container_name] = existing_container
                return existing_container
            else:
                logger.debug(f"Found untracked stopped container {container_name}")
                return None

        except docker.errors.NotFound:
            # No container with this name exists
            return None

    def ensure_module_container_running(self, module_name):
        """Ensure a specific module's container is running"""
        try:
            from ..models import BenchmarkModule

            module = BenchmarkModule.query.filter_by(
                name=module_name, is_active=True
            ).first()
            if module:
                container = self.get_container(module_name)
                if not container:
                    logger.info(
                        f"Container not running for {module_name}, starting it..."
                    )
                    return self.start_module_container(module)
                return container
            else:
                logger.warning(f"No active module found with name: {module_name}")
                return None
        except Exception as e:
            logger.error(f"Error ensuring container for {module_name}: {e}")
            return None

    def stop_all_containers(self):
        """Stop all running module containers"""
        # Clear installing containers tracking
        with self._installation_lock:
            self.installing_containers.clear()

        # Stop containers tracked by us
        for container_name, container in list(self.running_containers.items()):
            try:
                container.stop()
                container.remove(force=True)
                logger.info(f"Stopped container {container_name}")
            except Exception as e:
                logger.error(f"Error stopping container {container_name}: {e}")

        self.running_containers.clear()

        # Also clean up any containers that might not be tracked
        try:
            all_containers = self.docker_client.containers.list(all=True)
            for container in all_containers:
                if container.name and container.name.startswith("module-container-"):
                    try:
                        container.stop()
                        container.remove(force=True)
                        logger.info(f"Cleaned up orphaned container {container.name}")
                    except Exception as e:
                        logger.warning(
                            f"Error cleaning up container {container.name}: {e}"
                        )
        except Exception as e:
            logger.warning(f"Error during container cleanup: {e}")


# Global container manager instance
container_manager = ContainerManager()
