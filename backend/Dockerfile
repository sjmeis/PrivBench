FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    python3-dev \
    libblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade -r requirements.txt

# TODO remove this from dockerfile
RUN python -m spacy download en_core_web_sm

COPY . .

ENV FLASK_APP=app
ENV FLASK_DEBUG=1

EXPOSE 5000

RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
