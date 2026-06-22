"""Railway entrypoint for Doncor backend.

The original API lives in server.py with routes under /api.
This wrapper also exposes / so opening the Railway URL directly does not return Not Found.
Jobs de RPA são criados aqui e processados pelo worker local (rpa_worker/worker.py).
"""

import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware

from models import RoboTriggerPayload
from server import app, db, _get_robo_config_latest, _require_robo_role
from portal_routes import attach_portal_routes


def _build_allowed_origins() -> List[str]:
    default_origins = [
        "https://www.doncor.site",
        "https://doncor.site",
        "https://doncor-git-main-rodrigoorodrigues-projects.vercel.app",
        "https://doncor-nze02j1ml-rodrigoorodrigues-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    env_values = [
        os.getenv("FRONTEND_URL", ""),
        os.getenv("CORS_ORIGINS", ""),
        os.getenv("ALLOWED_ORIGINS", ""),
    ]
    origins = set(default_origins)
    for value in env_values:
        for origin in str(value or "").split(","):
            origin = origin.strip().rstrip("/")
            if origin:
                origins.add(origin)
    return sorted(origins)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_build_allowed_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def railway_root():
    return {
        "message": "Don Cor API - Gestão de Apólices",
        "status": "online",
        "docs": "/docs",
        "api": "/api/",
        "diagnostics": "/api/diagnostics",
        "portalDonCor": "/api/portal-doncor/resumo",
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


def _proj():
    return {"_id": 0}


async def _list_collection(table_name: str, limit: int = 50):
    try:
        collection = getattr(db, table_name)
        return await collection.find({}, _proj()).sort("createdAt", -1).to_list(limit)
    except Exception as exc:
        return [{"id": f"erro-{table_name}", "status": "erro", "mensagem": str(exc)}]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_br() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")




def _remove_route(path: str, method: str) -> None:
    method = method.upper()
    app.router.routes[:] = [
        route for route in app.router.routes
        if not (getattr(route, "path", None) == path and method in (getattr(route, "methods", set()) or set()))
    ]


_remove_route("/api/robo/trigger-real", "POST")


@app.post("/api/robo/trigger-real")
async def trigger_robo_real(data: RoboTriggerPayload, _: None = Depends(_require_robo_role)):
    """Cria um job de RPA assíncrono.

    Em vez de chamar o Playwright de forma síncrona (e ser bloqueado pelo IP do Railway),
    esta versão cria um job 'pending' no MongoDB e retorna o job_id imediatamente.
    O worker local (rpa_worker/worker.py) faz polling, pega o job, executa o Playwright
    com o IP da sua rede e devolve o resultado via POST /api/worker/jobs/{job_id}/result.
    """
    cfg = await _get_robo_config_latest()
    if not cfg.get("operadoras"):
        raise HTTPException(status_code=400, detail="Nenhuma operadora configurada no RoboConfig")

    selected = cfg.get("operadoras", [])[0]
    if data.operadora_nome:
        for op in cfg.get("operadoras", []):
            if (op.get("nome") or "").lower() == data.operadora_nome.lower():
                selected = op
                break

    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "status": "pending",
        "user_id": data.user_id,
        "unique_login_code": data.unique_login_code,
        "apolice_id": data.apolice_id,
        "operadora": selected,
        "supabase": {
            "url": cfg.get("supabaseUrl") or os.getenv("SUPABASE_URL"),
            "serviceRoleKey": cfg.get("supabaseServiceRoleKey") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY"),
            "bucket": cfg.get("supabaseBucketBoletos") or os.getenv("SUPABASE_BUCKET_BOLETOS") or "boletos",
        },
        "createdAt": _now_iso(),
        "criadoEm": _now_br(),
        "updatedAt": _now_iso(),
        "result": None,
        "error": None,
        "startedAt": None,
        "completedAt": None,
    }
    await db.robo_jobs.insert_one(job)

    return {
        "message": "Job criado. Worker local irá processar em breve.",
        "job_id": job_id,
        "status": "pending",
        "operadora": selected.get("nome", ""),
        "instrucao": "Consulte GET /api/robo/jobs/{job_id} para acompanhar o status.",
    }


async def diagnostics_response():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""
    backend_url = os.getenv("BACKEND_URL", "")
    frontend_url = os.getenv("FRONTEND_URL", "")

    tables = {}
    for table in [
        "contratos_adesao", "contratos_empresarial", "faturas", "comissoes", "seguradoras", "produtos", "colaboradores",
        "robo_config", "robo_estado", "robo_execucoes_log", "boletos_baixados", "robo_arquivos", "robo_diagnosticos", "portal_chat", "portal_parceiros", "portal_solicitacoes", "portal_formularios",
    ]:
        tables[table] = await _count_table(table)

    supabase_ok = bool(supabase_url and supabase_key) and all(item.get("ok") for item in tables.values())

    return {
        "status": "ok" if supabase_ok else "warning",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "railway": {"api": "online", "portConfigured": bool(os.getenv("PORT")), "backendUrl": backend_url or None},
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


@app.get("/api/robo/historico")
async def robo_historico(limit: int = Query(default=50, ge=1, le=200), _: None = Depends(_require_robo_role)):
    boletos = await _list_collection("boletos_baixados", limit)
    arquivos = await _list_collection("robo_arquivos", limit)
    diagnosticos = await _list_collection("robo_diagnosticos", limit)
    return {
        "resumo": {
            "boletosBaixados": len([item for item in boletos if not str(item.get("id", "")).startswith("erro-")]),
            "arquivosGerados": len([item for item in arquivos if not str(item.get("id", "")).startswith("erro-")]),
            "diagnosticos": len([item for item in diagnosticos if not str(item.get("id", "")).startswith("erro-")]),
        },
        "boletos": boletos,
        "arquivos": arquivos,
        "diagnosticos": diagnosticos,
    }


attach_portal_routes(app, db, _proj, _now_iso, _now_br)
