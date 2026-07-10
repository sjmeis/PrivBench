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