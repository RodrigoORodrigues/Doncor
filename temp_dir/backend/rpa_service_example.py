"""Serviço RPA do Doncor com Playwright.

Fluxo objetivo para login autorizado em portais de operadoras e baixa de boletos.
O padrão ASSIM salva a página HTML do boleto como PDF e envia ao Supabase Storage.
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

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

from rpa_storage import upload_files_to_supabase

try:
    from playwright.async_api import async_playwright
except Exception:
    async_playwright = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_BROWSER_READY = False
ASSIM_LOGIN_URL = "https://assim.com.br/site/?area=empresas&redir=2via_boleto"
ASSIM_BOLETO_URL = "https://assim.com.br/site/?area=acesso-empresa&area2=2via_boleto"


class RunRpaPayload(BaseModel):
    user_id: str
    unique_login_code: str
    apolice_id: str
    operadora: Dict[str, Any]
    supabase: Dict[str, Any] = {}


def _build_allowed_origins() -> List[str]:
    default_origins = [
        "https://www.doncor.site",
        "https://doncor.site",
        "https://doncor.up.railway.app",
        "https://doncor-rpa.up.railway.app",
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


app = FastAPI(title="Doncor RPA Service")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_build_allowed_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
    data["bodyText"] = await _body_text(page, 3000)
    try:
        data["htmlStart"] = (await page.content())[:3500]
    except Exception as exc:
        data["htmlError"] = str(exc)
    try:
        data["frames"] = await page.evaluate(
            """
            () => [{
              index: 0,
              url: location.href,
              inputs: Array.from(document.querySelectorAll('input, textarea')).slice(0, 80).map((e, i) => ({
                i, tag:e.tagName, type:e.getAttribute('type'), id:e.id, name:e.getAttribute('name'),
                value:e.getAttribute('value'), placeholder:e.getAttribute('placeholder'), cls:e.className,
                visible:!!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
              })),
              buttons: Array.from(document.querySelectorAll('button, input[type=submit], input[type=button], a')).slice(0, 120).map((e, i) => ({
                i, tag:e.tagName, type:e.getAttribute('type'), text:(e.innerText || e.value || '').trim(),
                href:e.getAttribute('href'), title:e.getAttribute('title'), onclick:e.getAttribute('onclick'),
                cls:e.className, visible:!!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
              }))
            }]
            """
        )
    except Exception:
        pass
    return data


async def _close_known_modals(page) -> None:
    close_selectors = [
        "#modalSemBoleto a:has-text('Fechar')",
        "#modalSemBoleto button:has-text('Fechar')",
        "#modalSemBoleto [data-dismiss='modal']",
        "#modalAviso a:has-text('Fechar')",
        "#modalAviso button:has-text('Fechar')",
        "#modalAviso [data-dismiss='modal']",
        ".modal.show a:has-text('Fechar')",
        ".modal.show button:has-text('Fechar')",
        ".modal.show [data-dismiss='modal']",
        "button:has-text('Aceitar')",
        "a:has-text('Aceitar')",
    ]
    for selector in close_selectors:
        try:
            locator = page.locator(selector).first
            if await locator.count() > 0 and await locator.is_visible(timeout=700):
                await locator.click(timeout=2500, force=True)
                logger.info("Modal/cookie fechado com seletor: %s", selector)
                await page.wait_for_timeout(350)
        except Exception:
            pass
    try:
        removed = await page.evaluate(
            """
            () => {
              let changed = false;
              document.querySelectorAll('#modalSemBoleto, #modalAviso, .modal.show, .modal-backdrop').forEach((el) => {
                el.classList.remove('show'); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); changed = true;
              });
              document.body.classList.remove('modal-open');
              document.body.style.overflow = ''; document.body.style.paddingRight = '';
              return changed;
            }
            """
        )
        if removed:
            logger.info("Modal removido por fallback JavaScript.")
    except Exception:
        pass


async def _first_visible_locator(page, selector: str, timeout_ms: int = 45000):
    deadline = time.time() + timeout_ms / 1000
    items = [s.strip() for s in selector.split(",") if s.strip()]
    while time.time() < deadline:
        await _close_known_modals(page)
        for target in [page] + list(page.frames):
            for item in items:
                try:
                    locator = target.locator(item).first
                    if await locator.count() > 0 and await locator.is_visible(timeout=700):
                        return locator
                except Exception:
                    pass
        await page.wait_for_timeout(300)
    return None


async def _fill_first(page, selector: str, value: str, label: str, timeout_ms: int = 45000):
    locator = await _first_visible_locator(page, selector, timeout_ms=timeout_ms)
    if locator is None:
        debug = await _debug_page_state(page)
        logger.error("Campo %s não encontrado. Diagnóstico: %s", label, debug)
        raise HTTPException(status_code=422, detail={"message": f"Campo {label} não encontrado.", "selector_usado": selector, "diagnostico": debug})
    await locator.fill(value or "", timeout=timeout_ms)
    return locator


async def _click_first(page, selector: str, label: str, timeout_ms: int = 45000):
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
    initial_wait = int(op.get("initialWaitMs", 25000 if _is_amil(op) else 8000))
    try:
        await page.wait_for_load_state("networkidle", timeout=25000)
    except Exception:
        logger.info("Networkidle não estabilizou; continuando com espera visual.")
    await page.wait_for_timeout(initial_wait)
    await _close_known_modals(page)
    if await _first_visible_locator(page, user_selector, timeout_ms=5000):
        return
    logger.warning("Tela de login sem campo de usuário após espera inicial; recarregando uma vez.")
    await page.reload(wait_until="domcontentloaded", timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=25000)
    except Exception:
        pass
    await page.wait_for_timeout(initial_wait)
    await _close_known_modals(page)


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


async def _is_assim_direct_boleto_page(page) -> bool:
    try:
        title = (await page.title()).lower()
    except Exception:
        title = ""
    text = (await _body_text(page, 7000)).lower()
    url = page.url.lower()
    return (
        "boleto2.php" in url
        or "emissão 2ª via de lâmina" in title
        or "emissao 2" in title
        or (
            "valor do documento" in text
            and "nosso número" in text
            and ("237-2" in text or "bradesco" in text or "ficha de compens" in text)
        )
    )


async def _save_assim_boleto_page_as_pdf(page, payload: RunRpaPayload, idx: int, label: str) -> Optional[str]:
    if not await _is_assim_direct_boleto_page(page):
        return None
    path = _new_file_path(payload, idx, ".pdf")
    try:
        await page.emulate_media(media="screen")
    except Exception:
        pass
    await page.pdf(
        path=path,
        format="A4",
        print_background=True,
        margin={"top": "6mm", "right": "6mm", "bottom": "6mm", "left": "6mm"},
    )
    logger.info("ASSIM: boleto salvo como PDF a partir da página direta (%s): %s", label, path)
    return path


async def _submit_assim_period_with_script(page, op: Dict[str, Any]) -> Dict[str, Any]:
    periodo = _infer_assim_period(op)
    mes = periodo["mes"]
    ano = periodo["ano"]
    logger.info("ASSIM: preenchendo Mês/Ano de forma direta apenas porque a tabela não apareceu: mes=%s ano=%s", mes, ano)
    result = await page.evaluate(
        """
        async ({mes, ano}) => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const setValue = (selector, value) => {
            const el = document.querySelector(selector);
            if (!el) return false;
            el.focus(); el.value = value; el.setAttribute('value', value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur(); return true;
          };
          const setAno = setValue('input[name="ano"]', ano);
          const setMes = setValue('input[name="mes"]', mes);
          await sleep(250);
          const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"], a, [onclick]'));
          const enviar = candidates.find((el) => {
            const text = `${el.innerText || ''} ${el.value || ''} ${el.title || ''} ${el.getAttribute('onclick') || ''}`.toUpperCase();
            return visible(el) && text.includes('ENVIAR');
          });
          if (enviar) {
            enviar.click();
            return {setAno, setMes, action: 'clicked', tag: enviar.tagName, text: (enviar.innerText || enviar.value || enviar.title || '').trim(), onclick: enviar.getAttribute('onclick')};
          }
          const form = document.querySelector('input[name="ano"]')?.closest('form') || document.querySelector('input[name="mes"]')?.closest('form') || document.querySelector('form');
          if (form) {
            if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
            return {setAno, setMes, action: 'formSubmit'};
          }
          return {setAno, setMes, action: 'noSubmitTarget'};
        }
        """,
        {"mes": mes, "ano": ano},
    )
    logger.info("ASSIM: script de consulta executado: %s", result)
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        logger.info("ASSIM: networkidle após consulta não estabilizou; continuando.")
    await page.wait_for_timeout(3000)
    return result


async def _select_assim_first_boleto(page) -> Dict[str, Any]:
    result = await page.evaluate(
        """
        () => {
          const radio = document.querySelector('#opcaoBoleto') ||
                        document.querySelector('#resultado-boleto input[name="opcaoBoleto"]') ||
                        document.querySelector('input[name="opcaoBoleto"]') ||
                        document.querySelector('table input[type="radio"]') ||
                        document.querySelector('input[type="radio"]');
          if (!radio) return {selected: false, reason: 'radio_not_found'};
          radio.checked = true;
          radio.setAttribute('checked', 'checked');
          const row = radio.closest('tr');
          const cells = row ? Array.from(row.querySelectorAll('td')).map((td) => (td.innerText || '').trim()) : [];
          const value = radio.value || cells.join(' | ');
          window.opcaoBoleto = value; window.$opcaoBoleto = value; window.desc = value; window.$desc = value;
          return {selected: true, id: radio.id, name: radio.name, value, cells};
        }
        """
    )
    logger.info("ASSIM: seleção de boleto: %s", result)
    await page.wait_for_timeout(500)
    return result


async def _click_assim_download_js(page) -> Dict[str, Any]:
    return await page.evaluate(
        """
        async () => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const radio = document.querySelector('#opcaoBoleto') || document.querySelector('input[name="opcaoBoleto"]');
          if (radio) {
            radio.checked = true; radio.setAttribute('checked', 'checked');
            window.opcaoBoleto = radio.value || ''; window.$opcaoBoleto = radio.value || '';
            window.desc = radio.value || ''; window.$desc = radio.value || '';
          }
          const btn = document.querySelector("ul.botoes-acoes a[onclick*='downloadBoleto']") ||
                      document.querySelector(".botoes-acoes a[onclick*='downloadBoleto']") ||
                      document.querySelector("a[onclick*='downloadBoleto']") ||
                      document.querySelector("a[title*='Baixar PDF']");
          if (btn) { btn.scrollIntoView({block:'center', inline:'center'}); await sleep(250); btn.click(); return {action:'button_click', radio: radio ? radio.value : null}; }
          if (typeof window.downloadBoleto === 'function') { window.downloadBoleto(); return {action:'function_call', radio: radio ? radio.value : null}; }
          return {action:'not_found', radio: radio ? radio.value : null};
        }
        """
    )


async def _try_assim_download(page, payload: RunRpaPayload, idx: int, download_timeout: int) -> str:
    logger.info("ASSIM: fluxo objetivo iniciado. url_atual=%s", page.url)
    await _close_known_modals(page)

    if "area2=2via_boleto" not in page.url and "boleto2.php" not in page.url:
        logger.info("ASSIM: navegando direto para página interna de 2ª via.")
        await page.goto(ASSIM_BOLETO_URL, wait_until="domcontentloaded", timeout=60000)

    try:
        await page.wait_for_load_state("networkidle", timeout=25000)
    except Exception:
        logger.info("ASSIM: networkidle na página interna não estabilizou; continuando.")

    await page.wait_for_timeout(1500)
    await _close_known_modals(page)

    direct_file = await _save_assim_boleto_page_as_pdf(page, payload, idx, "página já aberta")
    if direct_file:
        return direct_file

    if await page.locator("#resultado-boleto, #opcaoBoleto, input[name='opcaoBoleto']").count() == 0 and await page.locator("input[name='ano']").count() > 0:
        await _submit_assim_period_with_script(page, payload.operadora)
        direct_file = await _save_assim_boleto_page_as_pdf(page, payload, idx, "após clicar em ENVIAR")
        if direct_file:
            return direct_file

    if await page.locator("#opcaoBoleto, input[name='opcaoBoleto']").count() > 0:
        await _select_assim_first_boleto(page)
        try:
            async with page.expect_download(timeout=download_timeout) as download_info:
                action = await _click_assim_download_js(page)
                logger.info("ASSIM: ação de download executada via JS: %s", action)
            download = await download_info.value
            path = _new_file_path(payload, idx, ".pdf")
            await download.save_as(path)
            logger.info("ASSIM: boleto baixado por evento de download: %s", path)
            return path
        except Exception as exc:
            logger.warning("ASSIM: botão não gerou evento de download; verificando página HTML: %s", exc)
            direct_file = await _save_assim_boleto_page_as_pdf(page, payload, idx, "após clicar em Baixar PDF")
            if direct_file:
                return direct_file

    debug = await _debug_page_state(page)
    logger.error("ASSIM: não conseguiu baixar/salvar o boleto. Diagnóstico: %s", debug)
    raise HTTPException(status_code=404, detail={"message": "ASSIM: o robô não conseguiu gerar ou reconhecer a página do boleto.", "diagnostico": debug})


async def _try_generic_download(page, context, payload: RunRpaPayload, max_downloads: int, download_timeout: int) -> List[str]:
    files: List[str] = []
    selector = _selector(payload.operadora, "boleto", "a[href*='boleto'], a[href*='segunda-via'], a[href*='2via'], button:has-text('Boleto'), a:has-text('Boleto')")
    locators = await page.locator(selector).all()
    logger.info("Genérico: encontrados %s candidato(s) de boleto.", len(locators))
    for idx, locator in enumerate(locators):
        if len(files) >= max_downloads:
            break
        try:
            async with page.expect_download(timeout=download_timeout) as download_info:
                await locator.click(timeout=10000, force=True)
            download = await download_info.value
            path = _new_file_path(payload, idx, ".pdf")
            await download.save_as(path)
            files.append(path)
        except Exception as exc:
            logger.info("Genérico: candidato %s não gerou download: %s", idx + 1, exc)
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
            await page.goto(op.get("url") or ASSIM_LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
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
            await page.wait_for_timeout(int(op.get("loginWaitMs", 7000)))
            logger.info("Login concluído, aguardando carregamento")

            await _run_optional_steps(page, op.get("steps") or [])
            await _close_known_modals(page)

            if _is_assim(op):
                downloaded_files = [await _try_assim_download(page, payload, 0, download_timeout)]
            else:
                downloaded_files = await _try_generic_download(page, context, payload, max_downloads, download_timeout)

            if not downloaded_files:
                raise HTTPException(status_code=404, detail={"message": "Nenhum PDF foi baixado.", "diagnostico": await _debug_page_state(page)})
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
    uploaded_files = upload_files_to_supabase(files, payload)
    elapsed = round(time.time() - start, 2)
    upload_failures = [item for item in uploaded_files if item.get("status") != "uploaded"]
    result = {
        "status": "success" if not upload_failures else "success_with_upload_warning",
        "message": "RPA executado com sucesso." if not upload_failures else "RPA gerou PDF, mas houve aviso no upload para o Supabase Storage.",
        "processed": len(files),
        "duration_seconds": elapsed,
        "user_id": payload.user_id,
        "apolice_id": payload.apolice_id,
        "operadora": payload.operadora.get("nome", "Operadora"),
        "files": files,
        "uploaded_files": uploaded_files,
    }
    RPA_EXECUTIONS.insert(0, {
        "id": str(time.time()),
        "processo": "Extração de boletos RPA",
        "inicio": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "duracao": f"{elapsed}s",
        "status": "Concluído" if not upload_failures else "Concluído com aviso",
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
            "url": RPA_CONFIG_STORE.get("supabaseUrl", "") or os.getenv("SUPABASE_URL", ""),
            "serviceRoleKey": RPA_CONFIG_STORE.get("supabaseServiceRoleKey", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_SERVICE_KEY", ""),
            "bucket": RPA_CONFIG_STORE.get("supabaseBucketBoletos", "boletos") or os.getenv("SUPABASE_BUCKET_BOLETOS", "boletos"),
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
            "uploaded_files": [],
        }
    return await run_rpa(run_payload)


@app.get("/api/robo/execucoes-local")
async def robo_execucoes_api():
    return RPA_EXECUTIONS
