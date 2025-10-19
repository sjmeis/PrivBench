#!/bin/bash
set -e

# Activate virtual environment from root directory
if [ -d "../venv" ]; then
    source ../venv/bin/activate
else
    echo "Virtual environment not found in root directory"
    exit 1
fi

# Load environment variables from .env, ignoring comments and empty lines
if [ -f .env ]; then
    echo "Loading .env file..."
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo "Warning: .env file not found"
fi

# Wait for Redis
echo "Waiting for Redis..."
until redis-cli ping; do
    sleep 1
done
echo "Redis is ready!"

# Start Celery worker
echo "Starting Celery worker..."
celery -A app.celery worker --loglevel=DEBUG 