FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y postgresql-client

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV FLASK_APP=app
ENV FLASK_DEBUG=1

EXPOSE 5000

RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
