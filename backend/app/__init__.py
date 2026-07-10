from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from celery import Celery
from datetime import datetime

from .utils.monitor import start_monitor
from .utils.container_manager import container_manager
from .config import Config
from .extensions import db, mail, migrate
import logging
import os

jwt = JWTManager()
#migrate = Migrate()
#mail = Mail()


def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config["CELERY_RESULT_BACKEND"],
        broker=app.config["CELERY_BROKER_URL"],
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
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    CORS(
        app,
        resources={
            r"/*": {
                "origins": ["https://privbench.com"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
                "expose_headers": ["Content-Range", "X-Content-Range"],
            }
        },
    )

    app.config.from_object(Config)
    app.config.update(
        CELERY_BROKER_URL="redis://redis:6379/0",
        CELERY_RESULT_BACKEND="redis://redis:6379/0",
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
    from .routes.admin import admin_bp
    from .routes.support import support_bp
    from .routes.public import public_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(ranking_bp)
    app.register_blueprint(metadata_bp)
    app.register_blueprint(benchmark_bp)
    app.register_blueprint(module_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(support_bp)
    app.register_blueprint(public_bp)

    @app.cli.command("start-containers")
    def start_containers():
        """Start all module containers"""
        logger = logging.getLogger(__name__)
        try:
            logger.info("Starting module containers from CLI...")
            with app.app_context():
                container_manager.start_all_module_containers()
            logger.info("Module containers started successfully")
        except Exception as e:
            error_msg = f"Error starting module containers: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    # Cleanup containers on app shutdown
    @app.cli.command("stop-containers")
    def stop_containers():
        """Stop all module containers"""
        logger = logging.getLogger(__name__)
        try:
            logger.info("Stopping module containers from CLI...")
            container_manager.stop_all_containers()
            logger.info("Module containers stopped successfully")
        except Exception as e:
            error_msg = f"Error stopping module containers: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    @app.cli.command("rebuild-modules")
    def rebuild_modules():
        """Force rebuild all benchmark module images from host files without data loss."""
        logger = logging.getLogger(__name__)
        try:
            from .models import BenchmarkModule
            from .utils.module_manager import ModuleManager

            logger.info("Initializing mass evaluation image compilation sequence...")
            
            manager = ModuleManager()
            modules = db.session.query(BenchmarkModule).all()
            
            logger.info(f"Discovered {len(modules)} module blueprints in database.")
            
            req_map = {
                'Similarity': 'similarity-reqs.txt',
                'MaskedTokenInference': 'masked-token-reqs.txt',
                'AttributeInference': 'attribute-inference-reqs.txt',
                'Coherence': 'coh-reqs.txt',
                'LengthRobustness': 'length-robustness-reqs.txt',
                'LengthVariation': 'length-variation-reqs.txt',
                'Mauve': 'mauve-reqs.txt',
                'NearestNeighbor': 'nearest-neighbor-reqs.txt',
                'NERpriv': 'nerpriv-reqs.txt',
                'UtilityPreservation': 'utility-preservation-reqs.txt'
            }

            for m in modules:
                req_file = req_map.get(m.name, "requirements.txt")
                computed_req_path = os.path.join('/app/modules', req_file)

                logger.info(f"Compiling fresh runtime environment layers for: {m.name}...")
                manager.build_module_container(
                    module_path=m.path,
                    module_name=m.name,
                    requirements_path=computed_req_path if os.path.exists(computed_req_path) else None,
                    use_gpu=m.use_gpu
                )

                from .models import AppVersion, ModuleUpdate
                
                v1_release = db.session.query(AppVersion).filter_by(version='1.0.0').first()
                if not v1_release:
                    v1_release = AppVersion(version='1.0.0', created_at=datetime.utcnow())
                    db.session.add(v1_release)
                    db.session.flush()

                for m in modules:
                    exists = db.session.query(ModuleUpdate).filter_by(module_id=m.id, version_id=v1_release.id).first()
                    if not exists:
                        log = ModuleUpdate(
                            version_id=v1_release.id,
                            module_id=m.id,
                            update_type='new_module',
                            change_level='major',
                            is_updated=True,
                            description=f"Initialized and compiled baseline benchmark module for '{m.name}'."
                        )
                        db.session.add(log)
            
            db.session.commit()
            logger.info("Automatically synchronized changelog history logs for v1.0.0!")
            logger.info("All target benchmark module containers updated successfully!")
        except Exception as e:
            error_msg = f"Rebuild transaction aborted: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e
        
    @app.cli.command("build-logs")
    def logs():
        """Build baseline logs for v1.0.0"""
        logger = logging.getLogger(__name__)
        try:
            from .models import BenchmarkModule
            from .utils.module_manager import ModuleManager
            manager = ModuleManager()
            modules = db.session.query(BenchmarkModule).all()
            
            logger.info(f"Discovered {len(modules)} module blueprints in database.")
            
            for m in modules:
                from .models import AppVersion, ModuleUpdate
                
                v1_release = db.session.query(AppVersion).filter_by(version='1.0.0').first()
                if not v1_release:
                    v1_release = AppVersion(version='1.0.0', created_at=datetime.utcnow())
                    db.session.add(v1_release)
                    db.session.flush()

                for m in modules:
                    exists = db.session.query(ModuleUpdate).filter_by(module_id=m.id, version_id=v1_release.id).first()
                    if not exists:
                        log = ModuleUpdate(
                            version_id=v1_release.id,
                            module_id=m.id,
                            update_type='new_module',
                            change_level='major',
                            is_updated=True,
                            description=f"Initialized and compiled baseline benchmark module for '{m.name}'."
                        )
                        db.session.add(log)
            
            db.session.commit()
            logger.info("Automatically synchronized changelog history logs for v1.0.0!")
        except Exception as e:
            error_msg = f"Transaction aborted: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    # Add health check endpoint
    @app.route("/health")
    def health_check():
        return {"status": "healthy"}, 200
    
    with app.app_context():
        start_monitor()

    return app


# Create the Flask app
app = create_app()

# Create the Celery instance
celery = make_celery(app)
