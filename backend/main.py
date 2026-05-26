"""Railway entrypoint for Doncor backend.

The original API lives in server.py with routes under /api.
This wrapper also exposes / so opening the Railway URL directly does not return Not Found.
"""

import os
from datetime import datetime, timezone

from server import app, db


@app.get("/")
async def railway_root():
    return {
        "message": "Don Cor API - Gestão de Apólices",
        "status": "online",
        "docs": "/docs",
        "api": "/api/",
        "diagnostics": "/api/diagnostics",
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


async def _count_table(table_name: str):
    try:
        collection = getattr(db, table_name)
        count = await collection.count_documents({})
        return {"ok": True, "count": count}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


async def diagnostics_response():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""
    backend_url = os.getenv("BACKEND_URL", "")
    frontend_url = os.getenv("FRONTEND_URL", "")

    tables = {}
    for table in [
        "contratos_adesao",
        "contratos_empresarial",
        "faturas",
        "comissoes",
        "seguradoras",
        "produtos",
        "colaboradores",
        "robo_config",
        "robo_estado",
        "robo_execucoes_log",
    ]:
        tables[table] = await _count_table(table)

    supabase_ok = bool(supabase_url and supabase_key) and all(item.get("ok") for item in tables.values())

    return {
        "status": "ok" if supabase_ok else "warning",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "railway": {
            "api": "online",
            "portConfigured": bool(os.getenv("PORT")),
            "backendUrl": backend_url or None,
        },
        "supabase": {
            "urlConfigured": bool(supabase_url),
            "serviceRoleKeyConfigured": bool(supabase_key),
            "usingUrlHost": supabase_url.replace("https://", "").replace("http://", "").split("/")[0] if supabase_url else None,
            "tables": tables,
        },
        "vercel": {
            "frontendUrlConfiguredInBackend": bool(frontend_url),
            "frontendUrl": frontend_url or None,
            "note": "Para testar Vercel -> Railway, abra o frontend e confira se as chamadas usam REACT_APP_BACKEND_URL apontando para esta API.",
        },
    }


@app.get("/diagnostics")
async def diagnostics_root():
    return await diagnostics_response()


@app.get("/api/diagnostics")
async def diagnostics_api():
    return await diagnostics_response()
