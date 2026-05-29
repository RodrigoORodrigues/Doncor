"""Serviço RPA do Doncor com Playwright.

Serviço separado para login autorizado em portais de operadoras e tentativa de
baixa de boletos. Cada operadora pode informar seletores personalizados.
"""

from __future__ import annotations

import datetime
import logging
import os
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

# Caminho previsível para os navegadores no container Railway/Docker.
# Precisa ser definido antes de importar o Playwright.
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")

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
    global _BROWSER_READY
    if _BROWSER_READY or async_playwright is None:
        return
    logger.info("Verificando navegador Chromium do Playwright...")
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    _BROWSER_READY = True
    logger.info("Chromium do Playwright pronto.")


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
    return await health()


def _selector(op: Dict[str, Any], key: str, fallback: str) -> str:
    selectors = op.get("selectors") or {}
    return selectors.get(key) or fallback


def _split_selectors(selector: str) -> List[str]:
    return [part.strip() for part in str(selector or "").split(",") if part.strip()]


def _is_amil(op: Dict[str, Any]) -> bool:
    nome = str(op.get("nome") or "").lower()
    url = str(op.get("url") or "").lower()
    return "amil" in nome or "amil.com.br" in url


async def _debug_page_state(page) -> Dict[str, Any]:
    data: Dict[str, Any] = {"url": page.url, "title": "", "bodyText": "", "frames": [], "htmlStart": ""}
    try:
        data["title"] = await page.title()
    except Exception as exc:
        data["titleError"] = str(exc)
    try:
        data["bodyText"] = (await page.locator("body").inner_text(timeout=5000))[:2000]
    except Exception as exc:
        data["bodyTextError"] = str(exc)
    try:
        data["htmlStart"] = (await page.content())[:2000]
    except Exception as exc:
        data["htmlError"] = str(exc)

    for idx, frame in enumerate(page.frames):
        frame_info: Dict[str, Any] = {"index": idx, "url": frame.url, "inputs": [], "buttons": [], "links": []}
        try:
            frame_info["inputs"] = await frame.locator("input, textarea, [contenteditable='true']").evaluate_all(
                "els => els.slice(0, 60).map((e, i) => ({i, tag:e.tagName, type:e.getAttribute('type'), id:e.id, name:e.getAttribute('name'), placeholder:e.getAttribute('placeholder'), aria:e.getAttribute('aria-label'), cls:e.className}))"
            )
        except Exception as exc:
            frame_info["inputsError"] = str(exc)
        try:
            frame_info["buttons"] = await frame.locator("button, input[type='submit'], [role='button']").evaluate_all(
                "els => els.slice(0, 60).map((e, i) => ({i, tag:e.tagName, text:(e.innerText || e.value || '').trim(), id:e.id, type:e.getAttribute('type'), cls:e.className}))"
            )
        except Exception as exc:
            frame_info["buttonsError"] = str(exc)
        try:
            frame_info["links"] = await frame.locator("a").evaluate_all(
                "els => els.slice(0, 80).map((e, i) => ({i, text:(e.innerText || '').trim(), href:e.href, id:e.id, cls:e.className}))"
            )
        except Exception as exc:
            frame_info["linksError"] = str(exc)
        data["frames"].append(frame_info)
    return data


async def _close_known_modals(page) -> bool:
    closed = False
    close_selectors = [
        "#modalAviso button:has-text('Fechar')",
        "#modalAviso a:has-text('Fechar')",
        "#modalAviso [data-dismiss='modal']",
        "#modalAviso [data-bs-dismiss='modal']",
        "#modalAviso .close",
        ".modal.show button:has-text('Fechar')",
        ".modal.show a:has-text('Fechar')",
        ".modal.show [data-dismiss='modal']",
        ".modal.show [data-bs-dismiss='modal']",
        ".modal.show .close",
    ]
    for selector in close_selectors:
        try:
            locator = page.locator(selector).first
            if await locator.count() > 0 and await locator.is_visible(timeout=1000):
                await locator.click(timeout=3000, force=True)
                await page.wait_for_timeout(800)
                logger.info("Modal fechado com seletor: %s", selector)
                closed = True
                break
        except Exception:
            pass

    try:
        removed = await page.evaluate(
            """
            () => {
              let changed = false;
              document.querySelectorAll('#modalAviso, .modal.show, .modal-backdrop').forEach((el) => {
                el.classList.remove('show');
                el.style.display = 'none';
                el.setAttribute('aria-hidden', 'true');
                changed = true;
              });
              document.body.classList.remove('modal-open');
              document.body.style.overflow = '';
              document.body.style.paddingRight = '';
              return changed;
            }
            """
        )
        if removed:
            await page.wait_for_timeout(500)
            logger.info("Modal removido por fallback JavaScript.")
            closed = True
    except Exception:
        pass
    return closed


async def _first_visible_locator(page, selector: str, timeout_ms: int = 45000):
    deadline = time.time() + (timeout_ms / 1000)
    selectors = _split_selectors(selector)
    while time.time() < deadline:
        for target in [page] + list(page.frames):
            for item in selectors:
                try:
                    locator = target.locator(item).first
                    if await locator.count() > 0 and await locator.is_visible(timeout=1000):
                        return locator
                except Exception:
                    pass
        await page.wait_for_timeout(500)
    return None


async def _fill_first(page, selector: str, value: str, label: str, timeout_ms: int = 45000):
    await _close_known_modals(page)
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        debug = await _debug_page_state(page)
        logger.error("Campo %s não encontrado. Diagnóstico: %s", label, debug)
        raise HTTPException(status_code=422, detail={"message": f"Campo {label} não encontrado.", "selector_usado": selector, "diagnostico": debug})
    await locator.fill(value, timeout=timeout_ms)
    return locator


async def _click_first(page, selector: str, label: str, timeout_ms: int = 45000):
    await _close_known_modals(page)
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        debug = await _debug_page_state(page)
        logger.error("Botão/link %s não encontrado. Diagnóstico: %s", label, debug)
        raise HTTPException(status_code=422, detail={"message": f"Botão/link {label} não encontrado.", "selector_usado": selector, "diagnostico": debug})
    try:
        await locator.click(timeout=timeout_ms)
        return locator
    except Exception as exc:
        logger.warning("Clique normal falhou em %s: %s. Tentando force/fallback.", label, exc)
        await _close_known_modals(page)
        try:
            await locator.click(timeout=5000, force=True)
            return locator
        except Exception:
            if "tipoLogin1" in selector:
                await page.evaluate(
                    """
                    () => {
                      const radio = document.querySelector('#tipoLogin1');
                      if (radio) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('input', { bubbles: true }));
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                    """
                )
                logger.info("Radio #tipoLogin1 marcado por fallback JavaScript.")
                return locator
            debug = await _debug_page_state(page)
            raise HTTPException(status_code=422, detail={"message": f"Botão/link {label} encontrado, mas não clicável.", "selector_usado": selector, "diagnostico": debug})


async def _run_optional_steps(page, steps: List[Dict[str, Any]]):
    for step in steps or []:
        action = step.get("action")
        selector = step.get("selector")
        value = step.get("value", "")
        timeout = int(step.get("timeout", 30000))
        await _close_known_modals(page)
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
    initial_wait = int(op.get("initialWaitMs", 25000 if _is_amil(op) else 10000))
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        logger.info("Networkidle não estabilizou; continuando com espera visual.")
    await page.wait_for_timeout(initial_wait)
    await _close_known_modals(page)
    found = await _first_visible_locator(page, user_selector, timeout_ms=5000)
    if found is not None:
        return
    logger.warning("Tela de login sem campo de usuário após espera inicial; recarregando uma vez.")
    await page.reload(wait_until="domcontentloaded", timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass
    await page.wait_for_timeout(initial_wait)
    await _close_known_modals(page)


def _new_file_path(payload: RunRpaPayload, idx: int, suffix: str = ".pdf") -> str:
    fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_{idx}_", suffix=suffix)
    os.close(fd)
    return path


async def _save_response_if_file(response, payload: RunRpaPayload, idx: int, source: str) -> Optional[str]:
    try:
        headers = response.headers or {}
        content_type = (headers.get("content-type") or "").lower()
        disposition = (headers.get("content-disposition") or "").lower()
        body = await response.body()
        is_pdf = body.startswith(b"%PDF") or "application/pdf" in content_type
        is_attachment = "attachment" in disposition or "filename=" in disposition
        logger.info("Resposta candidato %s: status=%s content-type=%s bytes=%s origem=%s", idx + 1, response.status, content_type, len(body), source)
        if response.status < 400 and (is_pdf or is_attachment):
            path = _new_file_path(payload, idx, ".pdf" if is_pdf else ".bin")
            with open(path, "wb") as file:
                file.write(body)
            logger.info("Arquivo salvo por resposta direta: %s", path)
            return path
    except Exception as exc:
        logger.warning("Falha ao salvar resposta direta do boleto %s: %s", idx + 1, exc)
    return None


async def _try_download_url(context, url: str, payload: RunRpaPayload, idx: int) -> Optional[str]:
    if not url or url.startswith("javascript:") or url.endswith("#"):
        return None
    try:
        response = await context.request.get(url, timeout=30000)
        return await _save_response_if_file(response, payload, idx, url)
    except Exception as exc:
        logger.info("URL não baixou arquivo diretamente (%s): %s", url, exc)
        return None


async def _scan_page_for_file_links(page, context, payload: RunRpaPayload, base_idx: int) -> List[str]:
    found_files: List[str] = []
    selectors = [
        "a[href$='.pdf']",
        "a[href*='.pdf']",
        "a[href*='boleto']",
        "a[href*='download']",
        "a[href*='arquivo']",
        "a:has-text('PDF')",
        "a:has-text('Imprimir')",
        "a:has-text('Baixar')",
        "a:has-text('Boleto')",
        "button:has-text('Imprimir')",
        "button:has-text('Baixar')",
        "button:has-text('Boleto')",
    ]
    for selector in selectors:
        try:
            locators = await page.locator(selector).all()
        except Exception:
            continue
        for locator in locators[:5]:
            idx = base_idx + len(found_files)
            try:
                text = (await locator.inner_text(timeout=1000)).strip()
            except Exception:
                text = ""
            try:
                href = await locator.get_attribute("href")
            except Exception:
                href = None
            logger.info("Link interno candidato: selector=%s text=%s href=%s", selector, text[:80], href)
            if href:
                file_path = await _try_download_url(context, urljoin(page.url, href), payload, idx)
                if file_path:
                    found_files.append(file_path)
                    continue
            try:
                await _close_known_modals(page)
                async with page.expect_download(timeout=8000) as download_info:
                    await locator.click(timeout=5000, force=True)
                download = await download_info.value
                path = _new_file_path(payload, idx)
                await download.save_as(path)
                logger.info("Arquivo salvo por link interno: %s", path)
                found_files.append(path)
            except Exception:
                continue
    return found_files


async def _download_boleto_candidate(page, context, locator, payload: RunRpaPayload, idx: int, download_timeout: int) -> Optional[str]:
    await _close_known_modals(page)
    try:
        text = (await locator.inner_text(timeout=1000)).strip()
    except Exception:
        text = ""
    try:
        href = await locator.get_attribute("href")
    except Exception:
        href = None
    logger.info("Candidato boleto %s: text=%s href=%s", idx + 1, text[:120], href)

    if href:
        file_path = await _try_download_url(context, urljoin(page.url, href), payload, idx)
        if file_path:
            return file_path

    try:
        async with page.expect_download(timeout=download_timeout) as download_info:
            await locator.click(timeout=10000, force=True)
        download = await download_info.value
        path = _new_file_path(payload, idx)
        await download.save_as(path)
        logger.info("Boleto %s baixado por download do navegador: %s", idx + 1, path)
        return path
    except PlaywrightTimeoutError:
        logger.warning("Clique no candidato %s não gerou download direto. Tentando popup/navegação.", idx + 1)
    except Exception as exc:
        logger.warning("Falha no clique-download do candidato %s: %s", idx + 1, exc)

    try:
        async with page.expect_popup(timeout=8000) as popup_info:
            await locator.click(timeout=5000, force=True)
        popup = await popup_info.value
        try:
            await popup.wait_for_load_state("domcontentloaded", timeout=15000)
        except Exception:
            pass
        logger.info("Popup aberto para candidato %s: %s", idx + 1, popup.url)
        if popup.url:
            file_path = await _try_download_url(context, popup.url, payload, idx)
            if file_path:
                await popup.close()
                return file_path
        files = await _scan_page_for_file_links(popup, context, payload, idx)
        await popup.close()
        if files:
            return files[0]
    except Exception:
        pass

    try:
        current_url = page.url
        await locator.click(timeout=5000, force=True)
        await page.wait_for_timeout(4000)
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        logger.info("Após clique candidato %s: url antes=%s url depois=%s", idx + 1, current_url, page.url)
        files = await _scan_page_for_file_links(page, context, payload, idx)
        if files:
            return files[0]
    except Exception as exc:
        logger.info("Clique/navegação final candidato %s não baixou arquivo: %s", idx + 1, exc)
    return None


async def _run_playwright_flow(payload: RunRpaPayload) -> List[str]:
    if async_playwright is None:
        raise HTTPException(status_code=500, detail="Playwright não instalado no serviço RPA")
    ensure_playwright_chromium()

    op = payload.operadora
    portal_url = op.get("url")
    username = op.get("usuario")
    password = op.get("senha")

    user_selector = _selector(op, "usuario", "input[name='login'], input#login, input[name='usuario'], input#usuario, input[type='text']")
    password_selector = _selector(op, "senha", "input[name='password'], input[name='senha'], input#senha, input[type='password']")
    submit_selector = _selector(op, "entrar", "button[type='submit'], input[type='submit'], button:has-text('Entrar'), a:has-text('Entrar')")
    boleto_selector = _selector(op, "boleto", "a[href*='boleto'], a[href*='segunda-via'], button:has-text('Boleto'), a:has-text('Boleto'), a:has-text('2ª via')")

    downloaded_files: List[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1366,768"])
        context = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
        )
        page = await context.new_page()
        try:
            logger.info("Iniciando fluxo RPA para operadora: %s", op.get("nome"))
            await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            logger.info("Portal carregado: %s", portal_url)

            await _wait_for_login_screen(page, op, user_selector)
            await _run_optional_steps(page, op.get("preLoginSteps") or [])
            await _close_known_modals(page)

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
            await _close_known_modals(page)

            links = await page.locator(boleto_selector).all()
            logger.info("Encontrados %s candidato(s) de boleto pelo seletor: %s", len(links), boleto_selector)
            if not links:
                debug = await _debug_page_state(page)
                raise HTTPException(status_code=404, detail={"message": "Nenhum botão/link de boleto encontrado.", "diagnostico": debug})

            max_downloads = int(op.get("maxDownloads", 3))
            download_timeout = int(op.get("downloadTimeoutMs", 30000))
            for idx, link in enumerate(links[:max_downloads]):
                file_path = await _download_boleto_candidate(page, context, link, payload, idx, download_timeout)
                if file_path:
                    downloaded_files.append(file_path)
        except HTTPException:
            raise
        except Exception as e:
            debug = await _debug_page_state(page)
            logger.error("Erro no fluxo RPA: %s | Diagnóstico: %s", e, debug)
            raise HTTPException(status_code=500, detail={"message": str(e), "diagnostico": debug})
        finally:
            await context.close()
            await browser.close()

    if not downloaded_files:
        raise HTTPException(status_code=404, detail="Candidatos de boleto encontrados, mas nenhum arquivo/PDF foi baixado. Verifique se o portal exige etapa adicional ou ajuste o selector 'boleto' para o link final do PDF.")
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
        raise HTTPException(status_code=503, detail="Serviço RPA não disponível: Playwright não instalado.")

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
    RPA_EXECUTIONS.insert(0, {"id": str(time.time()), "processo": "Extração de boletos RPA", "inicio": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"), "duracao": f"{elapsed}s", "status": "Concluído", "resultado": result})
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
        supabase={"url": RPA_CONFIG_STORE.get("supabaseUrl", ""), "serviceRoleKey": RPA_CONFIG_STORE.get("supabaseServiceRoleKey", ""), "bucket": RPA_CONFIG_STORE.get("supabaseBucketBoletos", "boletos")},
    )
    if async_playwright is None:
        return {"status": "success", "message": "RPA executado em modo simulado.", "processed": 0, "duration_seconds": 0.1, "user_id": run_payload.user_id, "apolice_id": run_payload.apolice_id, "operadora": operadora.get("nome", "Operadora"), "files": []}
    return await run_rpa(run_payload)


@app.get("/api/robo/execucoes-local")
async def robo_execucoes_api():
    return RPA_EXECUTIONS
