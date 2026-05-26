import os
import uvicorn

raw_port = os.getenv("PORT", "8000")
try:
    port = int(raw_port)
except (TypeError, ValueError):
    port = 8000

print(f"Starting Doncor RPA Service on port {port}")
uvicorn.run("rpa_service_example:app", host="0.0.0.0", port=port)
