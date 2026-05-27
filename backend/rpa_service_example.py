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
from typing import Any, Dict, List, Optional, Tuple

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
    """Garante que o Chromium esperado pelo Playwright exista no container."""
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


def _split_selectors(selector: str) -> List[str]:
    return [part.strip() for part in selector.split(",") if part.strip()]


async def _first_visible_locator(page, selector: str, timeout_ms: int = 45000):
    """Procura um seletor visível na página principal e em iframes."""
    deadline = time.time() + (timeout_ms / 1000)
    selectors = _split_selectors(selector)

    while time.time() < deadline:
        frames = [page] + list(page.frames)
        for frame in frames:
            for item in selectors:
                try:
                    locator = frame.locator(item).first
                    count = await locator.count()
                    if count > 0:
                        try:
                            if await locator.is_visible(timeout=1000):
                                return locator
                        except Exception:
                            # Alguns campos existem, mas ainda não estão visíveis.
                            pass
                except Exception:
                    pass
        await page.wait_for_timeout(500)

    return None


async def _fill_first(page, selector: str, value: str, label: str, timeout_ms: int = 45000):
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        visible_inputs = await page.locator("input, textarea, [contenteditable='true']").evaluate_all(
            "els => els.slice(0, 25).map((e, i) => ({i, tag:e.tagName, type:e.getAttribute('type'), id:e.id, name:e.getAttribute('name'), placeholder:e.getAttribute('placeholder'), aria:e.getAttribute('aria-label'), cls:e.className}))"
        )
        logger.error("Campo %s não encontrado. Inputs detectados: %s", label, visible_inputs)
        raise HTTPException(
            status_code=422,
            detail=f"Campo {label} não encontrado no portal. Ajuste o seletor da operadora. Inputs detectados: {visible_inputs}",
        )
    await locator.fill(value, timeout=timeout_ms)
    return locator


async def _click_first(page, selector: str, label: str, timeout_ms: int = 45000):
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        buttons = await page.locator("button, input[type='submit'], a").evaluate_all(
            "els => els.slice(0, 30).map((e, i) => ({i, tag:e.tagName, text:(e.innerText || e.value || '').trim(), id:e.id, href:e.href, type:e.getAttribute('type'), cls:e.className}))"
        )
        logger.error("Botão/link %s não encontrado. Elementos detectados: %s", label, buttons)
        raise HTTPException(
            status_code=422,
            detail=f"Botão/link {label} não encontrado no portal. Ajuste o seletor da operadora. Elementos detectados: {buttons}",
        )
    await locator.click(timeout=timeout_ms)
    return locator


async def _run_optional_steps(page, steps: List[Dict[str, Any]]):
    for step in steps or []:
        action = step.get("action")
        selector = step.get("selector")
        value = step.get("value", "")
        timeout = int(step.get("timeout", 30000))

        if action == "click" and selector:
            await _click_first(page, selector, "etapa personalizada", timeout_ms=timeout)
        elif action == "fill" and selector:
            await _fill_first(page, selector, value, "etapa personalizada", timeout_ms=timeout)
        elif action == "wait_for_selector" and selector:
            found = await _first_visible_locator(page, selector, timeout_ms=timeout)
            if found is None:
                raise HTTPException(status_code=422, detail=f"Seletor personalizado não encontrado: {selector}")
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

    user_selector = _selector(
        op,
        "usuario",
        "input[name='username'], input#username, input[name='login'], input#login, "
        "input[name='usuario'], input#usuario, input[name='user'], input#user, "
        "input[name*='cpf' i], input[id*='cpf' i], input[name*='cnpj' i], input[id*='cnpj' i], "
        "input[name*='email' i], input[id*='email' i], input[type='email'], "
        "input[placeholder*='CPF' i], input[placeholder*='CNPJ' i], input[placeholder*='E-mail' i], "
        "input[placeholder*='email' i], input[placeholder*='Usuário' i], input[placeholder*='Usuario' i], "
        "input[placeholder*='Login' i], input[placeholder*='Código' i], input[placeholder*='Codigo' i], "
        "input[aria-label*='CPF' i], input[aria-label*='CNPJ' i], input[aria-label*='Usuário' i], "
        "input[formcontrolname*='login' i], input[formcontrolname*='usuario' i], input[formcontrolname*='cpf' i], "
        "input[type='text']",
    )
    password_selector = _selector(
        op,
        "senha",
        "input[name='password'], input#password, input[name='senha'], input#senha, "
        "input[name*='senha' i], input[id*='senha' i], input[name*='password' i], input[id*='password' i], "
        "input[placeholder*='Senha' i], input[placeholder*='password' i], input[type='password']",
    )
    submit_selector = _selector(
        op,
        "entrar",
        "button[type='submit'], input[type='submit'], button:has-text('Entrar'), button:has-text('Login'), "
        "button:has-text('Acessar'), a:has-text('Entrar'), a:has-text('Acessar'), "
        "[role='button']:has-text('Entrar'), [role='button']:has-text('Acessar')",
    )
    boleto_selector = _selector(
        op,
        "boleto",
        "a[href*='boleto'], a[href*='segunda-via'], a.download-boleto, button:has-text('Boleto'), "
        "button:has-text('2ª via'), button:has-text('Segunda via'), a:has-text('Boleto'), a:has-text('2ª via'), a:has-text('Segunda via')",
    )

    downloaded_files: List[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()
        try:
            logger.info(f"Iniciando fluxo RPA para operadora: {op.get('nome')}")
            await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            logger.info(f"Portal carregado: {portal_url}")

            # Portais SPA/Angular podem renderizar depois do domcontentloaded.
            try:
                await page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                logger.info("Networkidle não estabilizou; continuando com espera visual.")
            await page.wait_for_timeout(int(op.get("initialWaitMs", 7000)))

            await _run_optional_steps(page, op.get("preLoginSteps") or [])

            await _fill_first(page, user_selector, username, "usuário", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Usuário preenchido")

            await _fill_first(page, password_selector, password, "senha", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Senha preenchida")

            await _click_first(page, submit_selector, "entrar", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Botão de login clicado")

            try:
                await page.wait_for_load_state("networkidle", timeout=60000)
            except Exception:
                logger.info("Networkidle após login não estabilizou; continuando.")
            await page.wait_for_timeout(int(op.get("loginWaitMs", 5000)))
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
        except HTTPException:
            raise
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
