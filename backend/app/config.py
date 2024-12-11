import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dbname")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwtsecretkey")
   
    # JWT settings
    JWT_TOKEN_LOCATION = ["cookies"]
    # JWT_COOKIE_SECURE = os.getenv("FLASK_ENV", "development") == "production"  # Only True in production
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False # remove this later one
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    
    # Celery settings
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")