from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from celery import Celery
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()

celery = Celery(__name__, broker=Config.CELERY_BROKER_URL)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt.init_app(app)
    
    celery.conf.update(app.config)
    
    from .routes.auth import auth_bp
    from .routes.main import main_bp
    from .routes.data import data_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(data_bp)
    
    return app

app = create_app()