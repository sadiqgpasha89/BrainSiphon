# One image for the API, the worker and the scheduled jobs (the command selects the role).
#   docker build -f infrastructure/Dockerfile -t realtime-decisioning:local --build-arg GIT_SHA=$(git rev-parse --short HEAD) .
FROM python:3.13-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA PYTHONPATH=/app:/app/src PYTHONUNBUFFERED=1 PATH=/venv/bin:$PATH APP_HOME=/app
RUN useradd --uid 10001 --create-home app
WORKDIR /app
COPY --from=build /venv /venv
COPY --chown=app:app . .
# /registry is where Compose and Kubernetes mount the model registry volume. A new named volume takes the ownership of the
# image directory it is mounted on, so it must exist here, owned by the non-root user, or the first write is refused.
RUN mkdir -p /app/var /app/models/registry /registry && chown -R app:app /app/var /app/models /registry
USER app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz').status==200 else 1)"
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
