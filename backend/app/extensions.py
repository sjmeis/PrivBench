from flask_sqlalchemy import SQLAlchemy
from celery import Celery
from flask_mail import Mail
from flask_migrate import Migrate

db = SQLAlchemy()
celery = Celery("app")
mail = Mail()
migrate = Migrate()