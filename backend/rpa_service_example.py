"""Serviço RPA do Doncor com Playwright.

Serviço separado para login autorizado em portais de operadoras e baixa de boletos.
Cada operadora pode informar seletores personalizados.
"""

from __future__ import annotations

import datetime
import logging
import os
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urljoin

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from playwright.async_api import async_playwright
except Exception:
    async_playwright = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_BROWSER_READY = False

ASSIM_BOL_PAGE = "https://assim.com.br/site/?area=acesso-empresa&area2=2via_boleto"
ASSIM_RESULT_SELECTOR = "#resultado-boleto, #opcaoBoleto, input[name='opcaoBoleto'], a[onclick*='downloadBoleto']"
ASSIM_DOWNLOAD_SELECTOR = (
    "ul.botoes-acoes a[onclick*='downloadBoleto'], "
    ".botoes-acoes a[onclick*='downloadBoleto'], "
    "a[onclick*='downloadBoleto'][title*='Baixar PDF'], "
    "a[title*='Baixar PDF'], "
    "ul.botoes-acoes li:nth-child(3) a, "
    ".botoes-acoes li:nth-child(3) a"
)
ASSIM_ACTIONS_SELECTOR = "ul.botoes-acoes a, .botoes-acoes a"
GENERIC_BOLETO_SELECTOR = (
    "a[href*='boleto'], a[href*='segunda-via'], a[href*='2via'], "
    "button:has-text('Boleto'), a:has-text('Boleto'), a:has-text('2ª via'), a:has-text('2 via')"
)

NON_BOLETO_TERMS = (
    "programa_de_integridade", "programa-de-integridade", "msg-presidente",
    "codigo-de-conduta", "código de conduta", "politica", "política",
    "compliance", "diversidade", "inclusao", "conduta", "denuncia",
    "organograma", "igualdade-salarial", "assédio", "discriminacao",
    "hospitalidades", "integridade", "banco.bradesco",
)
BOLETO_TERMS = (
    "boleto", "downloadboleto", "baixar pdf", "2via", "2-via", "2ª via",
    "segunda-via", "fatura", "linha-digitavel",
)


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


def ensure_playwright_chromium() -> None:
    global _BROWSER_READY
    if _BROWSER_READY or async_playwright is None:
        return
    logger.info("Verificando navegador Chromium do Playwright...")
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    _BROWSER_READY = True
    logger.info("Chromium do Playwright pronto.")


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
    return (op.get("selectors") or {}).get(key) or fallback


def _is_assim(op: Dict[str, Any]) -> bool:
    nome = str(op.get("nome") or "").lower()
    url = str(op.get("url") or "").lower()
    return "assim" in nome or "assim.com.br" in url


def _is_amil(op: Dict[str, Any]) -> bool:
    nome = str(op.get("nome") or "").lower()
    url = str(op.get("url") or "").lower()
    return "amil" in nome or "amil.com.br" in url


def _looks_like_boleto(text: str = "", href: str = "", extra: str = "") -> bool:
    haystack = f"{text} {href} {extra}".lower()
    if any(term in haystack for term in NON_BOLETO_TERMS):
        return False
    return any(term in haystack for term in BOLETO_TERMS)


def _new_file_path(payload: RunRpaPayload, idx: int, suffix: str = ".pdf") -> str:
    fd, path = tempfile.mkstemp(prefix=f"boleto_{payload.apolice_id}_{idx}_", suffix=suffix)
    os.close(fd)
    return path


async def _body_text(page, limit: int = 2500) -> str:
    try:
        return (await page.locator("body").inner_text(timeout=4000))[:limit]
    except Exception:
        return ""


async def _debug_page_state(page) -> Dict[str, Any]:
    data: Dict[str, Any] = {"url": page.url, "title": "", "bodyText": "", "frames": [], "htmlStart": ""}
    try:
        data["title"] = await page.title()
    except Exception as exc:
        data["titleError"] = str(exc)
    data["bodyText"] = await _body_text(page, 2500)
    try:
        data["htmlStart"] = (await page.content())[:3500]
    except Exception as exc:
        data["htmlError"] = str(exc)

    for idx, frame in enumerate(page.frames):
        info: Dict[str, Any] = {"index": idx, "url": frame.url, "inputs": [], "links": []}
        try:
            info["inputs"] = await frame.locator("input, textarea, [contenteditable='true']").evaluate_all(
                "els => els.slice(0, 100).map((e, i) => ({i, tag:e.tagName, type:e.getAttribute('type'), id:e.id, name:e.getAttribute('name'), value:e.getAttribute('value'), placeholder:e.getAttribute('placeholder'), cls:e.className}))"
            )
        except Exception as exc:
            info["inputsError"] = str(exc)
        try:
            info["links"] = await frame.locator("a").evaluate_all(
                "els => els.slice(0, 160).map((e, i) => ({i, text:(e.innerText || '').trim(), href:e.getAttribute('href'), title:e.getAttribute('title'), onclick:e.getAttribute('onclick'), cls:e.className, visible:!!(e.offsetWidth || e.offsetHeight || e.getClientRects().length), html:(e.outerHTML || '').slice(0, 260)}))"
            )
        except Exception as exc:
            info["linksError"] = str(exc)
        data["frames"].append(info)
    return data


async def _close_known_modals(page) -> bool:
    closed = False
    close_selectors = [
        "#modalAviso button:has-text('Fechar')", "#modalAviso a:has-text('Fechar')",
        "#modalAviso [data-dismiss='modal']", "#modalAviso [data-bs-dismiss='modal']",
        "#modalAviso .close", ".modal.show button:has-text('Fechar')",
        ".modal.show a:has-text('Fechar')", ".modal.show [data-dismiss='modal']",
        ".modal.show [data-bs-dismiss='modal']", ".modal.show .close",
    ]
    for selector in close_selectors:
        try:
            locator = page.locator(selector).first
            if await locator.count() > 0 and await locator.is_visible(timeout=1000):
                await locator.click(timeout=3000, force=True)
                await page.wait_for_timeout(700)
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
            logger.info("Modal removido por fallback JavaScript.")
            closed = True
    except Exception:
        pass
    return closed


async def _first_visible_locator(page, selector: str, timeout_ms: int = 45000):
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        for target in [page] + list(page.frames):
            for item in [s.strip() for s in selector.split(",") if s.strip()]:
                try:
                    locator = target.locator(item).first
                    if await locator.count() > 0 and await locator.is_visible(timeout=800):
                        return locator
                except Exception:
                    pass
        await page.wait_for_timeout(400)
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
    await locator.click(timeout=timeout_ms, force=True)
    return locator


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
    if await _first_visible_locator(page, user_selector, timeout_ms=5000):
        return
    logger.warning("Tela de login sem campo de usuário após espera inicial; recarregando uma vez.")
    await page.reload(wait_until="domcontentloaded", timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass
    await page.wait_for_timeout(initial_wait)
    await _close_known_modals(page)


async def _wait_assim_resultado_boleto(page, timeout_ms: int = 60000) -> bool:
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        await _close_known_modals(page)
        if await page.locator(ASSIM_RESULT_SELECTOR).count() > 0:
            logger.info("ASSIM: resultado do boleto encontrado.")
            return True
        body = await _body_text(page, 700)
        logger.info("ASSIM: aguardando resultado do boleto. url=%s body=%s", page.url, body.replace("\n", " ")[:700])
        await page.wait_for_timeout(2500)
    return False


def _infer_assim_period(op: Dict[str, Any]) -> Dict[str, str]:
    raw = str(op.get("competencia") or op.get("mesAno") or op.get("mes_ano") or op.get("periodo") or "").strip()
    mes = str(op.get("mes") or op.get("mesBoleto") or op.get("boletoMes") or "").strip()
    ano = str(op.get("ano") or op.get("anoBoleto") or op.get("boletoAno") or "").strip()
    if raw and "/" in raw:
        left, right = raw.split("/", 1)
        mes = mes or left.strip()
        ano = ano or right.strip()
    if not mes or not ano:
        today = datetime.datetime.now()
        month = today.month + 1
        year = today.year
        if month > 12:
            month = 1
            year += 1
        mes = mes or f"{month:02d}"
        ano = ano or str(year)
    mes = mes.zfill(2)[-2:]
    if len(ano) == 2:
        ano = "20" + ano
    return {"mes": mes, "ano": ano}


async def _submit_assim_boleto_period_if_needed(page, op: Dict[str, Any]) -> bool:
    if await page.locator(ASSIM_RESULT_SELECTOR).count() > 0:
        return True

    ano_input = page.locator("input[name='ano']").first
    mes_input = page.locator("input[name='mes']").first
    if await ano_input.count() == 0 or await mes_input.count() == 0:
        logger.info("ASSIM: formulário mês/ano não encontrado; não há o que submeter.")
        return False

    periodo = _infer_assim_period(op)
    mes = periodo["mes"]
    ano = periodo["ano"]
    logger.info("ASSIM: resultado não apareceu; preenchendo fallback de período com mes=%s ano=%s", mes, ano)

    await ano_input.fill(ano, timeout=5000)
    await mes_input.fill(mes, timeout=5000)

    submit_selector = (
        "input[type='submit'], button[type='submit'], button:has-text('ENVIAR'), "
        "button:has-text('Enviar'), input[value*='ENVIAR'], input[value*='Enviar'], "
        "a:has-text('ENVIAR'), a:has-text('Enviar')"
    )
    btn = await _first_visible_locator(page, submit_selector, timeout_ms=8000)
    if btn is not None:
        await btn.click(timeout=5000, force=True)
    else:
        await page.evaluate(
            """
            () => {
              const form = document.querySelector('form[name="formBoleto"], form[action*="boleto"], form');
              if (form) form.submit();
            }
            """
        )

    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        logger.info("ASSIM: networkidle após enviar período não estabilizou; continuando.")
    await page.wait_for_timeout(3000)
    logger.info("ASSIM: período enviado; url=%s body=%s", page.url, (await _body_text(page, 700)).replace("\n", " ")[:700])
    return await page.locator(ASSIM_RESULT_SELECTOR).count() > 0


async def _select_assim_first_boleto(page) -> bool:
    radio_selector = "#resultado-boleto input[name='opcaoBoleto'], #opcaoBoleto, input[name='opcaoBoleto'], table input[type='radio'], input[type='radio']"
    radio = page.locator(radio_selector).first
    if await radio.count() == 0:
        logger.warning("ASSIM: nenhum radio de parcela/boleto encontrado para selecionar.")
        return False
    try:
        await radio.check(timeout=5000, force=True)
    except Exception:
        await radio.click(timeout=5000, force=True)
    await page.wait_for_timeout(1000)
    logger.info("ASSIM: boleto selecionado com #opcaoBoleto.")
    return True


async def _log_assim_action_buttons(page, label: str = "") -> int:
    try:
        details = await page.locator(ASSIM_ACTIONS_SELECTOR).evaluate_all(
            "els => els.slice(0, 12).map((e, i) => ({i, text:(e.innerText || '').trim(), title:e.getAttribute('title'), onclick:e.getAttribute('onclick'), href:e.getAttribute('href'), cls:e.className, visible:!!(e.offsetWidth || e.offsetHeight || e.getClientRects().length), html:(e.outerHTML || '').slice(0, 220)}))"
        )
        logger.info("ASSIM: botoes-acoes %s action_count=%s details=%s", label, len(details), details)
        return len(details)
    except Exception as exc:
        logger.info("ASSIM: falha ao mapear botoes-acoes %s: %s", label, exc)
        return 0


async def _save_download(download, payload: RunRpaPayload, idx: int, label: str) -> str:
    path = _new_file_path(payload, idx)
    await download.save_as(path)
    logger.info("Boleto %s baixado por %s: %s", idx + 1, label, path)
    return path


async def _try_assim_download(page, payload: RunRpaPayload, idx: int, download_timeout: int) -> str:
    logger.info("ASSIM: usando página atual pós-login: %s", page.url)
    await _close_known_modals(page)

    if "area2=2via_boleto" not in page.url:
        logger.info("ASSIM: navegando para página interna de 2ª via.")
        await page.goto(ASSIM_BOL_PAGE, wait_until="domcontentloaded", timeout=60000)

    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        logger.info("ASSIM: networkidle não estabilizou; continuando.")

    await page.wait_for_timeout(3000)
    await _close_known_modals(page)

    resultado_ok = await _wait_assim_resultado_boleto(page, timeout_ms=15000)
    if not resultado_ok:
        logger.warning("ASSIM: resultado-boleto não apareceu direto; verificando se a página exige mês/ano.")
        resultado_ok = await _submit_assim_boleto_period_if_needed(page, payload.operadora)
        if not resultado_ok:
            resultado_ok = await _wait_assim_resultado_boleto(page, timeout_ms=45000)

    if not resultado_ok:
        debug = await _debug_page_state(page)
        logger.error("ASSIM: resultado-boleto não apareceu. Diagnóstico: %s", debug)
        raise HTTPException(status_code=422, detail={
            "message": "ASSIM: a tabela #resultado-boleto não apareceu após login/consulta.",
            "orientacao": "A página exibiu a tela de Mês/Ano e não retornou a tabela de boleto.",
            "diagnostico": debug,
        })

    await _select_assim_first_boleto(page)
    await _log_assim_action_buttons(page, "na página interna/resultados")

    button = await _first_visible_locator(page, ASSIM_DOWNLOAD_SELECTOR, timeout_ms=30000)
    if button is None:
        debug = await _debug_page_state(page)
        logger.error("ASSIM: botão Baixar PDF não encontrado. Diagnóstico: %s", debug)
        raise HTTPException(status_code=422, detail={
            "message": "ASSIM: botão Baixar PDF/downloadBoleto não encontrado.",
            "selector_usado": ASSIM_DOWNLOAD_SELECTOR,
            "diagnostico": debug,
        })

    try:
        meta = await button.evaluate("e => ({title:e.getAttribute('title'), onclick:e.getAttribute('onclick'), href:e.getAttribute('href'), html:(e.outerHTML || '').slice(0, 220)})")
        logger.info("ASSIM: botão Baixar PDF encontrado: %s", meta)
    except Exception:
        pass

    try:
        async with page.expect_download(timeout=download_timeout) as download_info:
            await button.click(timeout=10000, force=True)
        return await _save_download(await download_info.value, payload, idx, "botão Baixar PDF do ASSIM")
    except Exception as exc:
        logger.warning("ASSIM: clique no botão Baixar PDF não gerou download: %s", exc)

    try:
        has_function = await page.evaluate("() => typeof window.downloadBoleto === 'function'")
        if has_function:
            async with page.expect_download(timeout=download_timeout) as download_info:
                await page.evaluate("() => window.downloadBoleto()")
            return await _save_download(await download_info.value, payload, idx, "função JavaScript downloadBoleto")
    except Exception as exc:
        logger.warning("ASSIM: função downloadBoleto não gerou download: %s", exc)

    debug = await _debug_page_state(page)
    logger.error("ASSIM: não conseguiu baixar o boleto. Diagnóstico: %s", debug)
    raise HTTPException(status_code=404, detail={"message": "ASSIM: tabela encontrada, mas o downloadBoleto não gerou arquivo.", "diagnostico": debug})


async def _save_response_if_file(response, payload: RunRpaPayload, idx: int, source: str, extra: str = "") -> Optional[str]:
    try:
        headers = response.headers or {}
        content_type = (headers.get("content-type") or "").lower()
        disposition = (headers.get("content-disposition") or "").lower()
        body = await response.body()
        is_pdf = body.startswith(b"%PDF") or "application/pdf" in content_type
        is_attachment = "attachment" in disposition or "filename=" in disposition
        if response.status < 400 and (is_pdf or is_attachment) and _looks_like_boleto(href=source, extra=f"{content_type} {disposition} {extra}"):
            path = _new_file_path(payload, idx, ".pdf" if is_pdf else ".bin")
            with open(path, "wb") as file:
                file.write(body)
            logger.info("Arquivo de boleto salvo por resposta direta: %s", path)
            return path
    except Exception as exc:
        logger.warning("Falha ao salvar resposta direta: %s", exc)
    return None


async def _try_generic_boleto_download(page, context, payload: RunRpaPayload, max_downloads: int, download_timeout: int) -> List[str]:
    files: List[str] = []
    visited: Set[str] = set()
    configured_selector = _selector(payload.operadora, "boleto", GENERIC_BOLETO_SELECTOR)
    locators = await page.locator(configured_selector).all()
    logger.info("Genérico: encontrados %s candidato(s) pelo seletor: %s", len(locators), configured_selector)

    for idx, locator in enumerate(locators):
        if len(files) >= max_downloads:
            break
        text = ""
        href = ""
        title = ""
        onclick = ""
        visible = False
        try:
            text = (await locator.inner_text(timeout=1000)).strip()
            href = await locator.get_attribute("href") or ""
            title = await locator.get_attribute("title") or ""
            onclick = await locator.get_attribute("onclick") or ""
            visible = await locator.is_visible(timeout=500)
        except Exception:
            pass
        logger.info("Genérico candidato %s: visible=%s text=%s href=%s title=%s onclick=%s", idx + 1, visible, text[:100], href, title, onclick)
        if not _looks_like_boleto(text=text, href=href, extra=f"{title} {onclick}"):
            continue
        full_url = urljoin(page.url, href) if href else ""
        if full_url and not full_url.startswith("javascript") and full_url not in visited:
            visited.add(full_url)
            try:
                response = await context.request.get(full_url, timeout=30000)
                saved = await _save_response_if_file(response, payload, idx, full_url, extra=f"{title} {onclick}")
                if saved:
                    files.append(saved)
                    continue
            except Exception:
                pass
        try:
            async with page.expect_download(timeout=download_timeout) as download_info:
                await locator.click(timeout=10000, force=True)
            files.append(await _save_download(await download_info.value, payload, idx, "clique genérico"))
        except Exception as exc:
            logger.info("Genérico: candidato %s não baixou por clique: %s", idx + 1, exc)
    return files


async def _run_playwright_flow(payload: RunRpaPayload) -> List[str]:
    if async_playwright is None:
        raise HTTPException(status_code=500, detail="Playwright não instalado no serviço RPA")
    ensure_playwright_chromium()

    op = payload.operadora
    user_selector = _selector(op, "usuario", "input[name='login'], input#login, input[name='usuario'], input#usuario, input[type='text']")
    password_selector = _selector(op, "senha", "input[name='password'], input[name='senha'], input#senha, input[type='password']")
    submit_selector = _selector(op, "entrar", "button[type='submit'], input[type='submit'], button:has-text('Entrar'), a:has-text('Entrar')")
    max_downloads = int(op.get("maxDownloads", 1))
    download_timeout = int(op.get("downloadTimeoutMs", 45000))

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
            await page.goto(op.get("url"), wait_until="domcontentloaded", timeout=60000)
            logger.info("Portal carregado: %s", op.get("url"))

            await _wait_for_login_screen(page, op, user_selector)
            await _run_optional_steps(page, op.get("preLoginSteps") or [])
            await _close_known_modals(page)

            await _fill_first(page, user_selector, op.get("usuario"), "usuário", timeout_ms=int(op.get("fieldTimeoutMs", 90000)))
            logger.info("Usuário preenchido")
            await _fill_first(page, password_selector, op.get("senha"), "senha", timeout_ms=int(op.get("fieldTimeoutMs", 90000)))
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

            if _is_assim(op):
                downloaded_files = [await _try_assim_download(page, payload, 0, download_timeout)]
            else:
                downloaded_files = await _try_generic_boleto_download(page, context, payload, max_downloads, download_timeout)

            if not downloaded_files:
                raise HTTPException(status_code=404, detail={"message": "Botão de boleto encontrado ou página aberta, mas nenhum PDF foi baixado.", "diagnostico": await _debug_page_state(page)})
            logger.info("RPA concluído: %s arquivo(s) baixado(s)", len(downloaded_files))
            return downloaded_files
        except HTTPException:
            raise
        except Exception as exc:
            debug = await _debug_page_state(page)
            logger.error("Erro no fluxo RPA: %s | Diagnóstico: %s", exc, debug)
            raise HTTPException(status_code=500, detail={"message": str(exc), "diagnostico": debug})
        finally:
            await context.close()
            await browser.close()


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
        return {
            "status": "success",
            "message": "RPA executado em modo simulado.",
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
