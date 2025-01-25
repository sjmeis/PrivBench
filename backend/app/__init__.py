from importlib import metadata
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_mail import Mail
from celery import Celery
from .config import Config
from .extensions import db
import logging

jwt = JWTManager()
migrate = Migrate()
mail = Mail()

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

def create_app():
    app = Flask(__name__)

    # Set up logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    CORS(app,
        resources={r"/*": {
                "origins": ["http://localhost:3000"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
                "expose_headers": ["Content-Range", "X-Content-Range"]
            }})
    
    app.config.from_object(Config)
    app.config.update(
        CELERY_BROKER_URL='redis://redis:6379/0',
        CELERY_RESULT_BACKEND='redis://redis:6379/0'
    )
    
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    
    from .routes.auth import auth_bp
    from .routes.main import main_bp
    from .routes.data import data_bp
    from .routes.ranking import ranking_bp
    from .routes.metadata import metadata_bp
    from .routes.benchmark import benchmark_bp
    from .routes.module import module_bp
    from .routes.user import user_bp
    from .routes.email import email_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(ranking_bp)
    app.register_blueprint(metadata_bp)
    app.register_blueprint(benchmark_bp)
    app.register_blueprint(module_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(email_bp)


    return app

# Create the Flask app
app = create_app()

# Create the Celery instance
celery = make_celery(app)