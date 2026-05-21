"""
Serviço RPA real (base) para plugar no RPA_SERVICE_URL.

Execute:
  uvicorn rpa_service_example:app --host 0.0.0.0 --port 9000 --reload

Dependências:
  pip install fastapi uvicorn playwright
  playwright install chromium
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
import os
import tempfile
import time

try:
    from playwright.async_api import async_playwright
except Exception:  # playwright pode não estar instalado no ambiente
    async_playwright = None


class RunRpaPayload(BaseModel):
    user_id: str
    unique_login_code: str
    apolice_id: str
    operadora: Dict[str, Any]
    supabase: Dict[str, Any]


app = FastAPI(title="Doncor RPA Service")


@app.get("/health")
async def health():
    return {"status": "ok"}


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

            # Ajuste os seletores abaixo conforme portal real da operadora
            await page.fill('input[name="username"], input#username, input[type="email"]', username)
            await page.fill('input[name="password"], input#password, input[type="password"]', password)
            await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")')
            await page.wait_for_timeout(3000)

            # Exemplo: tentar encontrar links de boletos para download
            links = await page.locator('a[href*="boleto"], a.download-boleto').all()
            for idx, link in enumerate(links[:3]):
                async with page.expect_download(timeout=20000) as download_info:
                    await link.click()
                download = await download_info.value
                fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_{idx}_", suffix=".pdf")
                os.close(fd)
                await download.save_as(path)
                downloaded_files.append(path)

            # Fallback para demonstração, caso nenhum download encontrado
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

    # TODO: subir arquivos em payload.supabase['bucket'] usando serviceRoleKey
    # TODO: registrar metadados no banco (boletos/processamento)

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
