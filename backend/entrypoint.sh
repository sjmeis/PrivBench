#!/bin/bash

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

# Start the application
echo "Starting the Flask application..."
exec flask run --host=0.0.0.0
