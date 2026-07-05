# AI face-matching service — deployable container.
# InsightFace has no Linux wheel, so we need a C/C++ toolchain to build it.
FROM python:3.12-slim

# Build + runtime libs (build-essential/cmake for insightface; libgl/libglib for OpenCV).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

# The buffalo_l model (~300 MB) downloads to /root/.insightface on first request.
# Mount a persistent disk at /app/data (SQLite face store) and /root/.insightface
# on your host so they survive restarts.
ENV DATA_DIR=/app/data
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
