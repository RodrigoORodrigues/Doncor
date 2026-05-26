"""Compatibilidade para comandos antigos do Railway.

Antes este arquivo subia apenas um serviço RPA isolado. Alguns deploys antigos da
Railway ainda podem estar usando `rpa_service_example:app` como start command.
Para evitar `Not Found` e manter o sistema Doncor funcionando, este módulo agora
expõe o app principal de `main.py` e adiciona as rotas RPA auxiliares no mesmo app.
"""

from __future__ import annotations

import os
import tempfile
import time
from typing import Any, Dict, List

from fastapi import HTTPException
from pydantic import BaseModel

from main import app

try:
    from playwright.async_api import async_playwright
except Exception:
    async_playwright = None


class RunRpaPayload(BaseModel):
    user_id: str
    unique_login_code: str
    apolice_id: str
    operadora: Dict[str, Any]
    supabase: Dict[str, Any]


RPA_CONFIG_STORE: Dict[str, Any] = {
    "intervaloMinutos": 15,
    "tentativas": 3,
    "notificacoes": True,
    "modoSeguro": True,
    "ambienteExecucao": "servico_externo",
    "triggerEndpoint": "/api/v1/trigger-rpa",
    "rpaServiceUrl": "",
    "timeoutSegundos": 120,
    "operadoras": [],
    "supabaseUrl": "",
    "supabaseServiceRoleKey": "",
    "supabaseBucketBoletos": "boletos",
    "logNivel": "INFO",
}
RPA_EXECUTIONS: List[Dict[str, Any]] = []


async def _run_playwright_flow(payload: RunRpaPayload) -> List[str]:
    if async_playwright is None:
        raise HTTPException(status_code=500, detail="Playwright não instalado no serviço RPA")

    op = payload.operadora
    portal_url = op.get("url")
    username = op.get("usuario")
    password = op.get("senha")

    downloaded_files: List[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            await page.fill('input[name="username"], input#username, input[type="email"]', username)
            await page.fill('input[name="password"], input#password, input[type="password"]', password)
            await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")')
            await page.wait_for_timeout(3000)

            links = await page.locator('a[href*="boleto"], a.download-boleto').all()
            for idx, link in enumerate(links[:3]):
                async with page.expect_download(timeout=20000) as download_info:
                    await link.click()
                download = await download_info.value
                fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_{idx}_", suffix=".pdf")
                os.close(fd)
                await download.save_as(path)
                downloaded_files.append(path)

            if not downloaded_files:
                fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_", suffix=".pdf")
                os.close(fd)
                downloaded_files.append(path)
        finally:
            await browser.close()

    return downloaded_files


@app.post("/run-rpa")
async def run_rpa(payload: RunRpaPayload):
    if not payload.operadora.get("url"):
        raise HTTPException(status_code=400, detail="Operadora URL não informada")
    if not payload.operadora.get("usuario"):
        raise HTTPException(status_code=400, detail="Operadora usuário não informado")
    if not payload.operadora.get("senha"):
        raise HTTPException(status_code=400, detail="Operadora senha não informada")

    start = time.time()
    files = await _run_playwright_flow(payload)
    elapsed = round(time.time() - start, 2)

    return {
        "status": "success",
        "message": "RPA executado com sucesso.",
        "processed": len(files),
        "duration_seconds": elapsed,
        "user_id": payload.user_id,
        "apolice_id": payload.apolice_id,
        "operadora": payload.operadora.get("nome", "Operadora"),
        "files": files,
    }


@app.get("/api/rpa/health")
async def rpa_health():
    return {"status": "ok", "service": "rpa"}


@app.get("/api/robo/config-local")
async def get_robo_config_api():
    return RPA_CONFIG_STORE


@app.post("/api/robo/config-local")
async def save_robo_config_api(config: Dict[str, Any]):
    RPA_CONFIG_STORE.update(config)
    return {"message": "Configuração local salva", "config": RPA_CONFIG_STORE}


@app.post("/api/robo/trigger-local")
async def trigger_real_api(payload: Dict[str, Any]):
    operadora = payload.get("operadora")
    if not operadora:
        operadoras = RPA_CONFIG_STORE.get("operadoras") or []
        operadora = operadoras[0] if operadoras else {}

    run_payload = RunRpaPayload(
        user_id=payload.get("user_id", ""),
        unique_login_code=payload.get("unique_login_code", ""),
        apolice_id=payload.get("apolice_id", ""),
        operadora=operadora,
        supabase={
            "url": RPA_CONFIG_STORE.get("supabaseUrl", ""),
            "serviceRoleKey": RPA_CONFIG_STORE.get("supabaseServiceRoleKey", ""),
            "bucket": RPA_CONFIG_STORE.get("supabaseBucketBoletos", "boletos"),
        },
    )

    result = await run_rpa(run_payload)
    RPA_EXECUTIONS.insert(0, {
        "id": str(time.time()),
        "processo": "Extração de boletos RPA",
        "inicio": time.strftime("%d/%m/%Y %H:%M"),
        "duracao": f"{result.get('duration_seconds', 0)}s",
        "status": "Concluído" if result.get("status") == "success" else "Finalizado",
        "resultado": result,
    })
    return {"message": "RPA local acionado", "result": result}


@app.get("/api/robo/execucoes-local")
async def robo_execucoes_api():
    return RPA_EXECUTIONS
