"""Serviço RPA do Doncor com Playwright.

Use este módulo em um serviço Railway separado para fazer login autorizado em
portais de operadoras e baixar boletos. Cada operadora pode informar seletores
personalizados para login e download.
"""

from __future__ import annotations

import os

# Caminho previsível para os navegadores no container Railway/Docker.
# Precisa ser definido antes de importar o Playwright.
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")

import tempfile
import time
import datetime
import logging
import subprocess
import sys
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
except Exception:
    async_playwright = None
    PlaywrightTimeoutError = Exception

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_BROWSER_READY = False


def ensure_playwright_chromium() -> None:
    """Garante que o Chromium esperado pelo Playwright exista no container.

    O Railway pode reaproveitar cache ou iniciar o app por comando customizado.
    Por isso esta validação fica também dentro do serviço RPA, não apenas no
    Dockerfile/start script.
    """
    global _BROWSER_READY
    if _BROWSER_READY:
        return

    if async_playwright is None:
        return

    logger.info("Verificando navegador Chromium do Playwright...")
    try:
        subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            check=True,
        )
        _BROWSER_READY = True
        logger.info("Chromium do Playwright pronto.")
    except Exception as exc:
        logger.exception("Falha ao instalar/verificar Chromium do Playwright: %s", exc)
        raise


class RunRpaPayload(BaseModel):
    user_id: str
    unique_login_code: str
    apolice_id: str
    operadora: Dict[str, Any]
    supabase: Dict[str, Any] = {}


app = FastAPI(title="Doncor RPA Service")

if async_playwright is None:
    logger.warning("Playwright não instalado. O serviço RPA funcionará em modo simulado.")
else:
    logger.info("Playwright instalado e disponível.")

RPA_CONFIG_STORE: Dict[str, Any] = {
    "intervaloMinutos": 15,
    "tentativas": 3,
    "notificacoes": True,
    "modoSeguro": True,
    "ambienteExecucao": "servico_externo",
    "triggerEndpoint": "/run-rpa",
    "rpaServiceUrl": "",
    "timeoutSegundos": 120,
    "operadoras": [],
    "supabaseUrl": "",
    "supabaseServiceRoleKey": "",
    "supabaseBucketBoletos": "boletos",
    "logNivel": "INFO",
}
RPA_EXECUTIONS: List[Dict[str, Any]] = []


@app.on_event("startup")
async def startup_check_browser():
    if async_playwright is not None:
        ensure_playwright_chromium()


@app.get("/")
async def root():
    return {"message": "Doncor RPA Service", "status": "online", "health": "/api/rpa/health"}


@app.get("/health")
async def health():
    playwright_available = async_playwright is not None
    return {
        "status": "ok" if playwright_available else "degraded",
        "service": "rpa",
        "playwright": "available" if playwright_available else "not_installed",
        "browserReady": _BROWSER_READY,
        "browserPath": os.getenv("PLAYWRIGHT_BROWSERS_PATH"),
    }


@app.get("/api/rpa/health")
async def rpa_health():
    playwright_available = async_playwright is not None
    return {
        "status": "ok" if playwright_available else "degraded",
        "service": "rpa",
        "playwright": "available" if playwright_available else "not_installed",
        "browserReady": _BROWSER_READY,
        "browserPath": os.getenv("PLAYWRIGHT_BROWSERS_PATH"),
    }


def _selector(op: Dict[str, Any], key: str, fallback: str) -> str:
    selectors = op.get("selectors") or {}
    return selectors.get(key) or fallback


async def _run_optional_steps(page, steps: List[Dict[str, Any]]):
    for step in steps or []:
        action = step.get("action")
        selector = step.get("selector")
        value = step.get("value", "")
        timeout = int(step.get("timeout", 30000))

        if action == "click" and selector:
            await page.locator(selector).first.click(timeout=timeout)
        elif action == "fill" and selector:
            await page.locator(selector).first.fill(value, timeout=timeout)
        elif action == "wait_for_selector" and selector:
            await page.locator(selector).first.wait_for(timeout=timeout)
        elif action == "wait" or action == "wait_timeout":
            await page.wait_for_timeout(int(step.get("ms", 1000)))
        elif action == "goto" and value:
            await page.goto(value, wait_until="domcontentloaded", timeout=timeout)


async def _run_playwright_flow(payload: RunRpaPayload) -> List[str]:
    if async_playwright is None:
        raise HTTPException(status_code=500, detail="Playwright não instalado no serviço RPA")

    ensure_playwright_chromium()

    op = payload.operadora
    portal_url = op.get("url")
    username = op.get("usuario")
    password = op.get("senha")

    user_selector = _selector(op, "usuario", 'input[name="username"], input#username, input[name="login"], input#login, input[type="email"], input[type="text"]')
    password_selector = _selector(op, "senha", 'input[name="password"], input#password, input[name="senha"], input#senha, input[type="password"]')
    submit_selector = _selector(op, "entrar", 'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Acessar")')
    boleto_selector = _selector(op, "boleto", 'a[href*="boleto"], a[href*="segunda-via"], a.download-boleto, button:has-text("Boleto"), button:has-text("2ª via"), button:has-text("Segunda via")')

    downloaded_files: List[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()
        try:
            logger.info(f"Iniciando fluxo RPA para operadora: {op.get('nome')}")
            await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            logger.info(f"Portal carregado: {portal_url}")

            await page.locator(user_selector).first.fill(username, timeout=30000)
            logger.info("Usuário preenchido")

            await page.locator(password_selector).first.fill(password, timeout=30000)
            logger.info("Senha preenchida")

            await page.locator(submit_selector).first.click(timeout=30000)
            logger.info("Botão de login clicado")

            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(int(op.get("loginWaitMs", 3000)))
            logger.info("Login concluído, aguardando carregamento")

            await _run_optional_steps(page, op.get("steps") or [])

            links = await page.locator(boleto_selector).all()
            if not links:
                raise HTTPException(status_code=404, detail="Nenhum botão/link de boleto encontrado. Ajuste o seletor 'boleto'.")

            logger.info(f"Encontrados {len(links)} boleto(s)")
            max_downloads = int(op.get("maxDownloads", 3))
            download_timeout = int(op.get("downloadTimeoutMs", 30000))

            for idx, link in enumerate(links[:max_downloads]):
                try:
                    async with page.expect_download(timeout=download_timeout) as download_info:
                        await link.click()
                    download = await download_info.value
                    fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_{idx}_", suffix=".pdf")
                    os.close(fd)
                    await download.save_as(path)
                    downloaded_files.append(path)
                    logger.info(f"Boleto {idx+1} baixado: {path}")
                except PlaywrightTimeoutError:
                    logger.warning(f"Timeout ao baixar boleto {idx+1}")
                    continue
        except Exception as e:
            logger.error(f"Erro no fluxo RPA: {e}")
            raise
        finally:
            await context.close()
            await browser.close()

    if not downloaded_files:
        raise HTTPException(status_code=404, detail="Boleto localizado, mas nenhum download foi concluído. Ajuste o fluxo ou seletores.")

    logger.info(f"RPA concluído: {len(downloaded_files)} arquivo(s) baixado(s)")
    return downloaded_files


@app.post("/run-rpa")
async def run_rpa(payload: RunRpaPayload):
    if not payload.operadora.get("url"):
        raise HTTPException(status_code=400, detail="Operadora URL não informada")
    if not payload.operadora.get("usuario"):
        raise HTTPException(status_code=400, detail="Operadora usuário não informado")
    if not payload.operadora.get("senha"):
        raise HTTPException(status_code=400, detail="Operadora senha não informada")

    if async_playwright is None:
        logger.error("Playwright não disponível. Retornando erro 503.")
        raise HTTPException(
            status_code=503,
            detail="Serviço RPA não disponível: Playwright não instalado. Configure adequadamente o serviço RPA."
        )

    start = time.time()
    files = await _run_playwright_flow(payload)
    elapsed = round(time.time() - start, 2)

    result = {
        "status": "success",
        "message": "RPA executado com sucesso.",
        "processed": len(files),
        "duration_seconds": elapsed,
        "user_id": payload.user_id,
        "apolice_id": payload.apolice_id,
        "operadora": payload.operadora.get("nome", "Operadora"),
        "files": files,
    }

    RPA_EXECUTIONS.insert(0, {
        "id": str(time.time()),
        "processo": "Extração de boletos RPA",
        "inicio": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "duracao": f"{elapsed}s",
        "status": "Concluído",
        "resultado": result,
    })
    return result


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

    if async_playwright is None:
        logger.warning("Playwright não disponível. Retornando resultado simulado.")
        return {
            "status": "success",
            "message": "RPA executado em modo simulado (Playwright não disponível).",
            "processed": 0,
            "duration_seconds": 0.1,
            "user_id": run_payload.user_id,
            "apolice_id": run_payload.apolice_id,
            "operadora": operadora.get("nome", "Operadora"),
            "files": [],
        }

    return await run_rpa(run_payload)


@app.get("/api/robo/execucoes-local")
async def robo_execucoes_api():
    return RPA_EXECUTIONS
