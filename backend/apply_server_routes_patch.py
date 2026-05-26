from pathlib import Path

server_path = Path(__file__).with_name("server.py")
content = server_path.read_text(encoding="utf-8")

marker = "# ─── Runtime compatibility routes for Railway ─────────────────────"
if marker not in content:
    content += r'''

# ─── Runtime compatibility routes for Railway ─────────────────────
@app.get("/")
async def railway_root_compat():
    return {
        "message": "Don Cor API - Gestão de Apólices",
        "status": "online",
        "api": "/api/",
        "diagnostics": "/api/diagnostics",
    }


async def _diagnostics_response_compat():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""

    async def _count_table_compat(table_name: str):
        try:
            collection = getattr(db, table_name)
            count = await collection.count_documents({})
            return {"ok": True, "count": count}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

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
        tables[table] = await _count_table_compat(table)

    supabase_ok = bool(supabase_url and supabase_key) and all(item.get("ok") for item in tables.values())

    return {
        "status": "ok" if supabase_ok else "warning",
        "railway": {"api": "online", "portConfigured": bool(os.getenv("PORT"))},
        "supabase": {
            "urlConfigured": bool(supabase_url),
            "serviceRoleKeyConfigured": bool(supabase_key),
            "usingUrlHost": supabase_url.replace("https://", "").replace("http://", "").split("/")[0] if supabase_url else None,
            "tables": tables,
        },
        "vercel": {
            "note": "Confira se REACT_APP_BACKEND_URL na Vercel aponta para esta API Railway.",
        },
    }


@app.get("/diagnostics")
async def diagnostics_root_compat():
    return await _diagnostics_response_compat()


@app.get("/api/diagnostics")
async def diagnostics_api_compat():
    return await _diagnostics_response_compat()
'''
    server_path.write_text(content, encoding="utf-8")
    print("server.py patched with Railway compatibility routes")
else:
    print("server.py already has Railway compatibility routes")
