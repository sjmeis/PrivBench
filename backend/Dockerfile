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

FROM nvidia/cuda:11.8.0-base-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    g++ \
    python3.9 \
    python3-pip \
    libblas-dev \
    liblapack-dev \
    netcat-traditional \
    redis-tools \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf $(which python3) /usr/bin/python && \
    ln -sf $(which pip3) /usr/bin/pip

RUN python --version && pip --version

RUN useradd -m celeryuser && \
    mkdir -p /data/privatized_datasets && \
    chown -R celeryuser:celeryuser /data /app

COPY backend/requirements.txt .
COPY modules/ ./modules/
RUN cat modules/*-reqs.txt >> requirements.txt || true

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.5.0/en_core_web_sm-3.5.0-py3-none-any.whl

COPY backend/ .
RUN chmod +x /app/entrypoint.sh /app/celery_entrypoint.sh && \
    chown -R celeryuser:celeryuser /app

USER celeryuser

ENV FLASK_APP=app \
    FLASK_DEBUG=1 \
    C_FORCE_ROOT=true \
    PYTHONPATH=/app \
    PATH="/home/celeryuser/.local/bin:${PATH}" \
    PYTHONUNBUFFERED=1

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]