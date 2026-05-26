"""Railway entrypoint for Doncor backend.

The original API lives in server.py with routes under /api.
This wrapper also exposes / so opening the Railway URL directly does not return Not Found.
"""

from server import app


@app.get("/")
async def railway_root():
    return {
        "message": "Don Cor API - Gestão de Apólices",
        "status": "online",
        "docs": "/docs",
        "api": "/api/",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}
