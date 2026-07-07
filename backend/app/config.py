import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://privbench.com")
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://user:password@db:5432/dbname"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwtsecretkey")
    # JWT settings
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = os.getenv("FLASK_ENV", "development") == "production"  # Only True in production
    JWT_SESSION_COOKIE_NAME = "access_token_cookie"
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)

    # Celery settings
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

    # Mail settings
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.web.de")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))  # Default port for SMTP
    MAIL_USE_TLS = bool(int(os.getenv("MAIL_USE_TLS", 1)))  # Use TLS
    MAIL_USE_SSL = bool(int(os.getenv("MAIL_USE_SSL", 0)))  # Use SSL (if set to true)
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "privbench@web.de")  # Email address
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "privbench123")  # Password
    MAIL_DEFAULT_SENDER = os.getenv(
        "MAIL_DEFAULT_SENDER", ("PrivBench", "privbench@web.de")
    )  # Default sender email
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL_WEB")
