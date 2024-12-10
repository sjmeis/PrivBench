#!/bin/bash

# Function to wait for Redis
wait_for_redis() {
    echo "Waiting for Redis..."
    while ! nc -z redis 6379; do
        sleep 1
    done
    echo "Redis is up!"
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

# Function to handle database migrations
setup_database() {
    # Ensure the migrations directory exists
    if [ ! -d "migrations" ]; then
        echo "Initializing migrations..."
        flask db init
    fi

    # Ensure the versions subdirectory exists
    if [ ! -d "migrations/versions" ]; then
        echo "Creating versions directory..."
        mkdir -p migrations/versions
    fi

    # Generate new migration script (if needed)
    echo "Generating migration script..."
    flask db migrate -m "Auto migration" || echo "No changes to migrate."

    # Apply migrations
    echo "Applying database migrations..."
    flask db upgrade
}

# Main execution logic
if [ "$1" = "celery" ]; then
    echo "Starting Celery worker..."
    wait_for_redis
    wait_for_postgres

    echo "Starting Celery worker with debug logging..."
    exec celery -A app.celery worker --loglevel=info
else
    # Setup database for Flask application
    wait_for_postgres
    setup_database

    # Start the Flask application
    echo "Starting the Flask application..."
    exec flask run --host=0.0.0.0
fi