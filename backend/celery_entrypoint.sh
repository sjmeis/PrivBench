#!/bin/bash
set -e

# Function to wait for Redis
wait_for_redis() {
    echo "Waiting for Redis..."
    while ! nc -z redis 6379; do
        sleep 1
    done
    echo "Redis is ready!"
    redis-cli -h redis ping
}

# Function to wait for PostgreSQL
wait_for_postgres() {
    echo "Waiting for PostgreSQL..."
    while ! nc -z db 5432; do
        sleep 1
    done
    echo "PostgreSQL is ready!"
}

# Wait for services
wait_for_redis
wait_for_postgres

# Start Celery worker
export PYTHONPATH=$PYTHONPATH:/app
echo "Starting Celery worker with debug logging..."
echo "PATH: $PATH"
echo "Python version: $(python --version)"
echo "Celery version: $(python -m celery --version)"

# exec python3 -m celery -A celery_app.celery worker --loglevel=debug -c 2
exec python3 -m celery -A celery_app.celery worker "$@"