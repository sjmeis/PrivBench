from app.extensions import celery
from app import create_app

# Create the Flask application
flask_app = create_app()

# Update celery config
celery.conf.update(flask_app.config)


class ContextTask(celery.Task):
    def __call__(self, *args, **kwargs):
        with flask_app.app_context():
            return self.run(*args, **kwargs)


# Set ContextTask BEFORE tasks are discovered so all tasks get app context
celery.Task = ContextTask

# Force autodiscovery of tasks so they use ContextTask as their base
celery.autodiscover_tasks(["app.services", "app.tasks"])

print("Available Celery tasks:")
print(celery.tasks.keys())
