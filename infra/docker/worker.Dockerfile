FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript poppler-utils tesseract-ocr tesseract-ocr-spa \
  && rm -rf /var/lib/apt/lists/*

COPY workers/seace/pyproject.toml workers/seace/pyproject.toml
COPY workers/seace/src workers/seace/src
COPY workers/seace/prompts workers/seace/prompts

WORKDIR /app/workers/seace
RUN pip install --no-cache-dir .

CMD ["buenapro-worker", "run", "--queues", "io"]
