#!/bin/sh
set -e

APP_PORT="${PORT:-8000}"
echo "Starting Doncor RPA Service on port ${APP_PORT}"

python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port "${APP_PORT}"
