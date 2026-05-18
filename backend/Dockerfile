FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files and buffering output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Auto-seed the SQLite database on container boot, then start the FastAPI application
CMD sh -c "python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"
