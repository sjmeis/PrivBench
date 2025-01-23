from app import create_app
from app.extensions import celery

# Create the Flask application
flask_app = create_app()

# Update celery config
celery.conf.update(flask_app.config)

class ContextTask(celery.Task):
    def __call__(self, *args, **kwargs):
        with flask_app.app_context():
            return self.run(*args, **kwargs)
        
print("Available Celery tasks:")
print(celery.tasks.keys())

celery.Task = ContextTask