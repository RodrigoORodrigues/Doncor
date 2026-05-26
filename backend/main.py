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


async def health_check_response():
    return {"status": "ok"}


@app.get("/health")
async def health_check():
    return await health_check_response()


@app.get("/saude")
async def health_check_pt_br_ascii():
    return await health_check_response()


@app.get("/saúde")
async def health_check_pt_br():
    return await health_check_response()
