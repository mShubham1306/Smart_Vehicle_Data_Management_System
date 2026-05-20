FROM python:3.10-slim

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Production start command — 2 workers, async UvicornWorker
CMD ["gunicorn", "main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120", "--keep-alive", "5", "--access-logfile", "-"]
