FROM nvidia/cuda:11.8.0-base-ubuntu22.04
#FROM python:3.9

WORKDIR /app

# 1. Install system dependencies (Root)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    g++ \
    python3.9 \
    python3-pip \
    python3.9-dev \
    libblas-dev \
    liblapack-dev \
    netcat-traditional \
    redis-tools \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.9 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# 2. Create User and Data Directories (Root)
RUN useradd -m celeryuser && \
    mkdir -p /data/privatized_datasets && \
    chown -R celeryuser:celeryuser /data /app

# 2. Setup Requirements (Root)
COPY backend/requirements.txt .
COPY modules/ ./modules/
RUN cat modules/*-reqs.txt >> requirements.txt || true

# 3. Install Python packages (Root)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.5.0/en_core_web_sm-3.5.0-py3-none-any.whl

# 5. Copy Application Code & Fix Permissions (Root)
#COPY . .
COPY backend/ .
RUN chmod +x /app/entrypoint.sh /app/celery_entrypoint.sh && \
    chown -R celeryuser:celeryuser /app

# 6. Switch to non-root user
USER celeryuser

# 7. Environment Variables
ENV FLASK_APP=app \
    FLASK_DEBUG=1 \
    C_FORCE_ROOT=true \
    PYTHONPATH=/app \
    PATH="/home/celeryuser/.local/bin:${PATH}" \
    PYTHONUNBUFFERED=1

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]