from flask_sqlalchemy import SQLAlchemy
from celery import Celery
from flask_mail import Mail

db = SQLAlchemy()
celery = Celery("app")
mail = Mail()