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

import datetime
import logging
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from playwright.async_api import TimeoutError as PlaywrightTimeoutError
    from playwright.async_api import async_playwright
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


def _is_amil(op: Dict[str, Any]) -> bool:
    nome = str(op.get("nome") or "").lower()
    url = str(op.get("url") or "").lower()
    return "amil" in nome or "amil.com.br" in url


async def _debug_page_state(page) -> Dict[str, Any]:
    """Coleta diagnóstico da tela que o robô está vendo, sem expor senha."""
    data: Dict[str, Any] = {
        "url": page.url,
        "title": "",
        "bodyText": "",
        "frames": [],
        "htmlStart": "",
    }
    try:
        data["title"] = await page.title()
    except Exception as exc:
        data["titleError"] = str(exc)

    try:
        data["bodyText"] = (await page.locator("body").inner_text(timeout=5000))[:1500]
    except Exception as exc:
        data["bodyTextError"] = str(exc)

    try:
        html = await page.content()
        data["htmlStart"] = html[:1500]
    except Exception as exc:
        data["htmlError"] = str(exc)

    for idx, frame in enumerate(page.frames):
        frame_info: Dict[str, Any] = {"index": idx, "url": frame.url, "inputs": [], "buttons": []}
        try:
            frame_info["inputs"] = await frame.locator("input, textarea, [contenteditable='true']").evaluate_all(
                "els => els.slice(0, 40).map((e, i) => ({i, tag:e.tagName, type:e.getAttribute('type'), id:e.id, name:e.getAttribute('name'), placeholder:e.getAttribute('placeholder'), aria:e.getAttribute('aria-label'), cls:e.className}))"
            )
        except Exception as exc:
            frame_info["inputsError"] = str(exc)
        try:
            frame_info["buttons"] = await frame.locator("button, input[type='submit'], a, [role='button']").evaluate_all(
                "els => els.slice(0, 40).map((e, i) => ({i, tag:e.tagName, text:(e.innerText || e.value || '').trim(), id:e.id, href:e.href, type:e.getAttribute('type'), cls:e.className}))"
            )
        except Exception as exc:
            frame_info["buttonsError"] = str(exc)
        data["frames"].append(frame_info)

    return data


async def _first_visible_locator(page, selector: str, timeout_ms: int = 45000):
    """Procura um seletor visível na página principal e em iframes."""
    deadline = time.time() + (timeout_ms / 1000)
    selectors = _split_selectors(selector)

    while time.time() < deadline:
        for target in [page] + list(page.frames):
            for item in selectors:
                try:
                    locator = target.locator(item).first
                    if await locator.count() > 0:
                        try:
                            if await locator.is_visible(timeout=1000):
                                return locator
                        except Exception:
                            pass
                except Exception:
                    pass
        await page.wait_for_timeout(500)

    return None


async def _fill_first(page, selector: str, value: str, label: str, timeout_ms: int = 45000):
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        debug = await _debug_page_state(page)
        logger.error("Campo %s não encontrado. Diagnóstico: %s", label, debug)
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Campo {label} não encontrado no portal. Ajuste o seletor da operadora ou verifique se o site bloqueou o carregamento no servidor.",
                "selector_usado": selector,
                "diagnostico": debug,
            },
        )
    await locator.fill(value, timeout=timeout_ms)
    return locator


async def _click_first(page, selector: str, label: str, timeout_ms: int = 45000):
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        debug = await _debug_page_state(page)
        logger.error("Botão/link %s não encontrado. Diagnóstico: %s", label, debug)
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Botão/link {label} não encontrado no portal. Ajuste o seletor da operadora.",
                "selector_usado": selector,
                "diagnostico": debug,
            },
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
        elif action in {"wait", "wait_timeout"}:
            await page.wait_for_timeout(int(step.get("ms", 1000)))
        elif action == "goto" and value:
            await page.goto(value, wait_until="domcontentloaded", timeout=timeout)


async def _wait_for_login_screen(page, op: Dict[str, Any], user_selector: str) -> None:
    """Espera SPA/Angular renderizar e tenta recuperar tela vazia."""
    initial_wait = int(op.get("initialWaitMs", 25000 if _is_amil(op) else 10000))
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        logger.info("Networkidle não estabilizou; continuando com espera visual.")

    await page.wait_for_timeout(initial_wait)

    found = await _first_visible_locator(page, user_selector, timeout_ms=5000)
    if found is not None:
        return

    logger.warning("Tela de login sem campo de usuário após espera inicial; recarregando uma vez.")
    try:
        await page.reload(wait_until="domcontentloaded", timeout=60000)
        try:
            await page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass
        await page.wait_for_timeout(initial_wait)
    except Exception as exc:
        logger.warning("Falha ao recarregar página antes do login: %s", exc)


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
        "input[name='username'], input.test_input_username, input.login-form__uppercase, "
        "input[name='login'], input#login, input[name='usuario'], input#usuario, "
        "input[name='user'], input#user, input[name*='cpf' i], input[id*='cpf' i], "
        "input[name*='cnpj' i], input[id*='cnpj' i], input[name*='email' i], input[id*='email' i], "
        "input[type='email'], input[placeholder*='CPF' i], input[placeholder*='CNPJ' i], "
        "input[placeholder*='E-mail' i], input[placeholder*='email' i], input[placeholder*='Usuário' i], "
        "input[placeholder*='Usuario' i], input[placeholder*='Login' i], input[placeholder*='Código' i], "
        "input[placeholder*='Codigo' i], input[aria-label*='CPF' i], input[aria-label*='CNPJ' i], "
        "input[aria-label*='Usuário' i], input[formcontrolname*='login' i], "
        "input[formcontrolname*='usuario' i], input[formcontrolname*='cpf' i], input[type='text']",
    )
    password_selector = _selector(
        op,
        "senha",
        "input[name='password'], input.test_input_password, input[name='senha'], input#senha, "
        "input[name*='senha' i], input[id*='senha' i], input[name*='password' i], input[id*='password' i], "
        "input[placeholder*='Senha' i], input[placeholder*='password' i], input[type='password']",
    )
    submit_selector = _selector(
        op,
        "entrar",
        "button[type='submit'], input[type='submit'], button:has-text('Entrar'), button:has-text('Login'), "
        "button:has-text('Acessar'), a:has-text('Entrar'), a:has-text('Acessar'), "
        ".test_button_login, [role='button']:has-text('Entrar'), [role='button']:has-text('Acessar')",
    )
    boleto_selector = _selector(
        op,
        "boleto",
        "a[href*='boleto'], a[href*='segunda-via'], a.download-boleto, button:has-text('Boleto'), "
        "button:has-text('2ª via'), button:has-text('Segunda via'), a:has-text('Boleto'), a:has-text('2ª via'), a:has-text('Segunda via')",
    )

    downloaded_files: List[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--window-size=1366,768",
            ],
        )
        context = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
        )
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = await context.new_page()

        try:
            logger.info("Iniciando fluxo RPA para operadora: %s", op.get("nome"))
            await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            logger.info("Portal carregado: %s", portal_url)

            await _wait_for_login_screen(page, op, user_selector)
            await _run_optional_steps(page, op.get("preLoginSteps") or [])

            await _fill_first(page, user_selector, username, "usuário", timeout_ms=int(op.get("fieldTimeoutMs", 90000)))
            logger.info("Usuário preenchido")

            await _fill_first(page, password_selector, password, "senha", timeout_ms=int(op.get("fieldTimeoutMs", 90000)))
            logger.info("Senha preenchida")

            await _click_first(page, submit_selector, "entrar", timeout_ms=int(op.get("fieldTimeoutMs", 90000)))
            logger.info("Botão de login clicado")

            try:
                await page.wait_for_load_state("networkidle", timeout=60000)
            except Exception:
                logger.info("Networkidle após login não estabilizou; continuando.")
            await page.wait_for_timeout(int(op.get("loginWaitMs", 10000)))
            logger.info("Login concluído, aguardando carregamento")

            await _run_optional_steps(page, op.get("steps") or [])

            links = await page.locator(boleto_selector).all()
            if not links:
                raise HTTPException(status_code=404, detail="Nenhum botão/link de boleto encontrado. Ajuste o seletor 'boleto'.")

            logger.info("Encontrados %s boleto(s)", len(links))
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
                    logger.info("Boleto %s baixado: %s", idx + 1, path)
                except PlaywrightTimeoutError:
                    logger.warning("Timeout ao baixar boleto %s", idx + 1)
                    continue
        except HTTPException:
            raise
        except Exception as e:
            debug = await _debug_page_state(page)
            logger.error("Erro no fluxo RPA: %s | Diagnóstico: %s", e, debug)
            raise
        finally:
            await context.close()
            await browser.close()

    if not downloaded_files:
        raise HTTPException(status_code=404, detail="Boleto localizado, mas nenhum download foi concluído. Ajuste o fluxo ou seletores.")

    logger.info("RPA concluído: %s arquivo(s) baixado(s)", len(downloaded_files))
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
            detail="Serviço RPA não disponível: Playwright não instalado. Configure adequadamente o serviço RPA.",
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

    RPA_EXECUTIONS.insert(
        0,
        {
            "id": str(time.time()),
            "processo": "Extração de boletos RPA",
            "inicio": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
            "duracao": f"{elapsed}s",
            "status": "Concluído",
            "resultado": result,
        },
    )
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
