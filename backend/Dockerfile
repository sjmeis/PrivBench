FROM python:3.9

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    python3-dev \
    libblas-dev \
    liblapack-dev \
    netcat-traditional \
    redis-tools \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade -r requirements.txt

# Install spacy language model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create celery_entrypoint.sh
RUN echo '#!/bin/bash\n\
# Wait for Redis\n\
echo "Waiting for Redis..."\n\
while ! nc -z redis 6379; do\n\
    sleep 1\n\
done\n\
echo "Redis is ready!"\n\
\n\
# Test Redis connection\n\
redis-cli -h redis ping\n\
\n\
# Start Celery worker with debug logging\n\
echo "Starting Celery worker..."\n\
celery -A celery_app.celery worker --loglevel=DEBUG' > /app/celery_entrypoint.sh

# Set environment variables
ENV FLASK_APP=app
ENV FLASK_DEBUG=1
ENV C_FORCE_ROOT=true
ENV PYTHONPATH=/app

# Create necessary directories
RUN mkdir -p /data/privatized_datasets

# Make entrypoint scripts executable
RUN chmod +x /app/entrypoint.sh /app/celery_entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]