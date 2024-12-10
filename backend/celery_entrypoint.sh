#!/bin/bash

# Wait for Redis to be ready
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
    sleep 1
done
echo "Redis is ready!"

# Test Redis connection
redis-cli -h redis ping

# List registered tasks before starting worker
echo "Listing registered tasks..."
celery -A celery_app.celery inspect registered

# Start Celery worker with debug logging
echo "Starting Celery worker..."
celery -A celery_app.celery worker --loglevel=DEBUG