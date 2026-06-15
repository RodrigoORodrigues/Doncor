"""Railway entrypoint for Doncor backend.

The original API lives in server.py with routes under /api.
This wrapper also exposes / so opening the Railway URL directly does not return Not Found.
It also persists files returned by the external RPA service into the RPA history tables.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import Depends, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware

from models import RoboTriggerPayload
from server import app, db, _get_robo_config_latest, _require_robo_role, _run_rpa_job
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


def _competencia_from_operadora(operadora: Dict[str, Any]) -> str:
    raw = str(operadora.get("competencia") or operadora.get("mesAno") or operadora.get("mes_ano") or operadora.get("periodo") or "").strip()
    if raw:
        return raw
    mes = str(operadora.get("mes") or operadora.get("mesBoleto") or operadora.get("boletoMes") or "").strip()
    ano = str(operadora.get("ano") or operadora.get("anoBoleto") or operadora.get("boletoAno") or "").strip()
    if mes and ano:
        if len(ano) == 2:
            ano = "20" + ano
        return f"{mes.zfill(2)[-2:]}/{ano}"
    today = datetime.now()
    month = today.month + 1
    year = today.year
    if month > 12:
        month = 1
        year += 1
    return f"{month:02d}/{year}"


def _file_records_from_result(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    candidates = result.get("uploaded_files") or result.get("arquivos") or result.get("files") or []
    records: List[Dict[str, Any]] = []
    for item in candidates:
        if isinstance(item, dict):
            records.append(item)
        elif isinstance(item, str):
            records.append({"local_path": item, "filename": os.path.basename(item), "status": "local_only"})
    return records


async def _persist_rpa_result(data: RoboTriggerPayload, operadora: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, int]:
    file_items = _file_records_from_result(result)
    inserted_boletos = 0
    inserted_arquivos = 0
    diagnostics = 0

    for idx, item in enumerate(file_items):
        url = item.get("arquivo_url") or item.get("public_url") or item.get("signed_url") or item.get("url")
        storage_path = item.get("storage_path") or item.get("path") or item.get("local_path") or ""
        filename = item.get("nome_arquivo") or item.get("filename") or item.get("arquivo_nome") or os.path.basename(storage_path) or f"boleto_{idx + 1}.pdf"
        bucket = item.get("storage_bucket") or item.get("bucket") or "boletos"
        status = "baixado" if url else "gerado_sem_url"
        common = {
            "user_id": data.user_id,
            "apolice_id": data.apolice_id,
            "operadora": item.get("operadora") or operadora.get("nome") or result.get("operadora") or "Operadora",
            "competencia": item.get("competencia") or _competencia_from_operadora(operadora),
            "vencimento": item.get("vencimento") or "",
            "arquivo_nome": filename,
            "nome_arquivo": filename,
            "arquivo_path": storage_path,
            "storage_path": storage_path,
            "storage_bucket": bucket,
            "bucket": bucket,
            "arquivo_url": url,
            "public_url": url,
            "signed_url": item.get("signed_url"),
            "raw_public_url": item.get("raw_public_url"),
            "tamanho_bytes": item.get("tamanho_bytes") or item.get("size") or 0,
            "content_type": item.get("content_type") or "application/pdf",
            "createdAt": _now_iso(),
            "criadoEm": _now_br(),
            "origem": "rpa",
        }
        await db.boletos_baixados.insert_one({"id": str(uuid.uuid4()), "status": status, **common})
        inserted_boletos += 1
        await db.robo_arquivos.insert_one({"id": str(uuid.uuid4()), "tipo": "boleto", "status": status, **common})
        inserted_arquivos += 1

        if not url or item.get("upload_error"):
            diagnostics += 1
            await db.robo_diagnosticos.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": data.user_id,
                "apolice_id": data.apolice_id,
                "operadora": common["operadora"],
                "etapa": "upload_supabase_storage",
                "status": "aviso" if item.get("upload_error") else "sem_url",
                "mensagem": item.get("upload_error") or "Arquivo gerado, mas sem URL para abrir no sistema.",
                "detalhe": item,
                "createdAt": _now_iso(),
                "criadoEm": _now_br(),
            })

    return {"boletos": inserted_boletos, "arquivos": inserted_arquivos, "diagnosticos": diagnostics}


def _remove_route(path: str, method: str) -> None:
    method = method.upper()
    app.router.routes[:] = [
        route for route in app.router.routes
        if not (getattr(route, "path", None) == path and method in (getattr(route, "methods", set()) or set()))
    ]


_remove_route("/api/robo/trigger-real", "POST")


@app.post("/api/robo/trigger-real")
async def trigger_robo_real(data: RoboTriggerPayload, _: None = Depends(_require_robo_role)):
    cfg = await _get_robo_config_latest()
    if not cfg.get("operadoras"):
        raise HTTPException(status_code=400, detail="Nenhuma operadora configurada no RoboConfig")

    selected = cfg.get("operadoras", [])[0]
    if data.operadora_nome:
        for op in cfg.get("operadoras", []):
            if (op.get("nome") or "").lower() == data.operadora_nome.lower():
                selected = op
                break

    job_payload = {
        "user_id": data.user_id,
        "unique_login_code": data.unique_login_code,
        "apolice_id": data.apolice_id,
        "operadora": selected,
        "supabase": {
            "url": cfg.get("supabaseUrl") or os.getenv("SUPABASE_URL"),
            "serviceRoleKey": cfg.get("supabaseServiceRoleKey") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY"),
            "bucket": cfg.get("supabaseBucketBoletos") or os.getenv("SUPABASE_BUCKET_BOLETOS") or "boletos",
        },
    }

    try:
        result = await _run_rpa_job(job_payload, cfg)
        persisted = await _persist_rpa_result(data, selected, result)
    except HTTPException as exc:
        await db.robo_diagnosticos.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": data.user_id,
            "apolice_id": data.apolice_id,
            "operadora": selected.get("nome") or data.operadora_nome or "Operadora",
            "etapa": "execucao_rpa",
            "status": "erro",
            "mensagem": str(exc.detail),
            "detalhe": exc.detail,
            "createdAt": _now_iso(),
            "criadoEm": _now_br(),
        })
        raise

    exec_item = {
        "id": str(uuid.uuid4()),
        "processo": "Extração de boletos RPA",
        "inicio": _now_br(),
        "duracao": f"{result.get('duration_seconds')}s" if result.get("duration_seconds") else "--",
        "status": "Concluído" if str(result.get("status", "")).startswith("success") else "Concluído com aviso",
        "resultado": result,
        "persisted": persisted,
        "createdAt": _now_iso(),
    }
    await db.robo_execucoes_log.insert_one(exec_item)
    return {"message": "RPA acionado", "result": result, "persisted": persisted}


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
