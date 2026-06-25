#!/bin/bash
set -e

# Trap SIGINT and SIGTERM to stop containers gracefully
cleanup() {
    echo "Stopping module containers..."
    python3 -m flask stop-containers || echo "Failed to stop containers"

    echo "Stopping Flask server..."
    if [ -n "$FLASK_PID" ]; then
        kill "$FLASK_PID"
        wait "$FLASK_PID" 2>/dev/null
    fi

    echo "Cleanup complete. Exiting."
    exit 0
}
trap cleanup SIGINT SIGTERM

wait_for_redis() {
    echo "Waiting for Redis..."
    while ! nc -z redis 6379; do sleep 1; done
    echo "Redis is up!"
}
wait_for_postgres() {
    echo "Waiting for PostgreSQL..."
    while ! nc -z db 5432; do sleep 1; done
    echo "PostgreSQL is ready!"
}

wait_for_flask() {
    echo "Waiting for Flask to be ready on 0.0.0.0:5000..."
    for i in {1..30}; do
        if bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/5000' 2>/dev/null; then
            echo "Flask is up!"
            return 0
        fi
        sleep 1
    done
    echo "Warning: Flask wait timed out, continuing anyway..."
} 

# Function to handle database migrations
setup_database() {
    # ── FORCE COMPILE REQUISITE BASELINE IMAGES IF MISSING ────────────────
    echo "Verifying baseline runtime images..."
    chmod 666 /var/run/docker.sock || echo "Warning: Socket permissions bypass failed..."
    
    if ! docker image inspect privbench-base-cpu:latest >/dev/null 2>&1; then
        echo "privbench-base-cpu:latest not found. Compiling base CPU container..."
        docker build -t privbench-base-cpu:latest -f /app/base_images/Dockerfile.base_cpu /app/base_images
    fi

    if ! docker image inspect privbench-base-gpu:latest >/dev/null 2>&1; then
        echo "privbench-base-gpu:latest not found. Compiling base GPU container (this may take a while)..."
        docker build -t privbench-base-gpu:latest -f /app/base_images/Dockerfile.base_gpu /app/base_images
    fi
    # ─────────────────────────────────────────────────────────────────────

    if [ "$FLASK_ENV" = "development" ] && [ "$CLEAN_DB" = "true" ]; then
        echo "CLEAN_DB is true: Dropping and recreating public database schema..."
        PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    fi

    echo "Applying database migrations..."
    python3 -m flask db upgrade || echo "Migration upgrade bypassed..."

    echo "Checking database initialization state..."
    TABLE_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='benchmark_module';")

    if [ "$TABLE_COUNT" = "0" ] || [ "$CLEAN_DB" = "true" ]; then
        echo "Database baseline tracking table is missing or empty. Running initial system configuration..."
        
        echo "Waiting for database service verification hook..."
        until pg_isready -h db -p 5432 -U "$POSTGRES_USER"; do
          sleep 1
        done

        echo "Executing setup-db.py script..."
        python3 /app/setup-db.py

        echo "Executing admin-setup.py script..."
        python3 /app/admin-setup.py
    else
        echo "Database already initialized with baseline parameters. Skipping setup-db.py execution to protect existing records."
    fi
}

# Main execution logic for Flask backend
echo "Starting Flask backend..."
wait_for_redis
wait_for_postgres

set +e
setup_database
set -e

echo "Starting the Flask application..."
#python -m flask run --host=0.0.0.0 &
"$@" &
FLASK_PID=$!

# Wait for Flask to be ready
wait_for_flask

# Start module containers
echo "Starting module containers..."
chmod 666 /var/run/docker.sock || echo "Warning: Could not set socket permissions"
python3 -m flask start-containers

# Bring Flask process back to foreground
wait $FLASK_PID