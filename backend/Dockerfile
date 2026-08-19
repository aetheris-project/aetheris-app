# syntax=docker/dockerfile:1
#
# Aetheris Python backend (FastAPI). Standalone image used by docker-compose.
# Health endpoint: GET /health.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first to benefit from Docker layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "aetheris_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
