#!/bin/bash

# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
exec python3 -m celery -A celery_app.celery worker \
    --loglevel=INFO \
    --max-tasks-per-child=10 \
    --max-memory-per-child=4000000 \
    -Ofair \
    "$@"