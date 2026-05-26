#!/bin/sh
set -e

echo "Starting Doncor RPA Service on port 8000"
python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port 8000
