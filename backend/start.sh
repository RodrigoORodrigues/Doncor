#!/bin/sh
set -e

APP_PORT="${PORT:-8000}"
echo "Starting Doncor API on port ${APP_PORT}"

python -m uvicorn main:app --host 0.0.0.0 --port "${APP_PORT}"
