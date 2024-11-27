from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from celery import Celery
from .config import Config
from .extensions import db

jwt = JWTManager()
migrate = Migrate()
celery = Celery(__name__, broker=Config.CELERY_BROKER_URL)

def create_app():
    app = Flask(__name__)
    CORS(app, 
        supports_credentials=True,  # Important for cookies
        origins=["http://localhost:3000"])
    
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    celery.conf.update(app.config)
    
    from .routes.auth import auth_bp
    from .routes.main import main_bp
    from .routes.data import data_bp
    from .routes.ranking import ranking_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(ranking_bp)
    
    return app

app = create_app()
