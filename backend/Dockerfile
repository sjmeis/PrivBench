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

# Create a non-root user for security
RUN useradd -m celeryuser

# Create /data directory as root and set ownership to celeryuser
RUN mkdir -p /data/privatized_datasets && chown -R celeryuser:celeryuser /data

# Install Python packages globally before switching to non-root user
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    python3 -m spacy download en_core_web_sm

# Switch to non-root user
USER celeryuser

# Copy application code
COPY --chown=celeryuser:celeryuser . .

# Copy entrypoint scripts
COPY --chown=celeryuser:celeryuser entrypoint.sh /app/entrypoint.sh
COPY --chown=celeryuser:celeryuser celery_entrypoint.sh /app/celery_entrypoint.sh

# Make entrypoint scripts executable
RUN chmod +x /app/entrypoint.sh /app/celery_entrypoint.sh

# Set environment variables
ENV FLASK_APP=app
ENV FLASK_DEBUG=1
ENV C_FORCE_ROOT=true
ENV PYTHONPATH=/app
ENV PATH="/home/celeryuser/.local/bin:${PATH}"

# Expose port 5000 for Flask
EXPOSE 5000

# Default entrypoint (can be overridden in docker-compose)
ENTRYPOINT ["/app/entrypoint.sh"]
