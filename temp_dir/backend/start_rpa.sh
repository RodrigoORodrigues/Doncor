#!/bin/sh
set -e

APP_PORT="${PORT:-8000}"

echo "Starting Doncor RPA Service on port ${APP_PORT} with corrected runtime"
python -m uvicorn rpa_service_runtime:app --host 0.0.0.0 --port "${APP_PORT}"
