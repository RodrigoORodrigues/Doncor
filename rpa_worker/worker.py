"""Worker local do Doncor RPA.

Este script roda no SEU PC, usando a SUA rede/VPN.
Ele faz polling na API do Railway, pega jobs pendentes, executa o Playwright
localmente (a AMIL vê o seu IP, não o IP do Railway) e devolve o resultado.

Uso:
    python worker.py

    # Com log mais detalhado:
    LOG_LEVEL=DEBUG python worker.py
"""

from __future__ import annotations

import datetime
import hashlib
import logging
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# ─── Carregar .env ────────────────────────────────────────────────────────────
_HERE = Path(__file__).parent
load_dotenv(_HERE / ".env")

# ─── Configuração ─────────────────────────────────────────────────────────────
RAILWAY_API_URL: str = os.getenv("RAILWAY_API_URL", "").rstrip("/")
WORKER_TOKEN: str = os.getenv("WORKER_TOKEN", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET_BOLETOS", "boletos")
POLL_INTERVAL: int = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("doncor-worker")

# ─── Playwright (importação opcional) ─────────────────────────────────────────
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(_HERE / "browsers"))

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_OK = True
except ImportError:
    sync_playwright = None  # type: ignore[assignment]
    PLAYWRIGHT_OK = False
    logger.warning("Playwright não instalado. Rode: pip install playwright && playwright install chromium")


# ──────────────────────────────────────────────────────────────────────────────
#  Helpers de HTTP
# ──────────────────────────────────────────────────────────────────────────────

def _worker_headers() -> Dict[str, str]:
    return {"X-Worker-Token": WORKER_TOKEN, "Content-Type": "application/json"}


def buscar_proximo_job() -> Optional[Dict[str, Any]]:
    """Consulta /api/worker/jobs/next e retorna o job ou None."""
    try:
        resp = requests.get(
            f"{RAILWAY_API_URL}/api/worker/jobs/next",
            headers=_worker_headers(),
            timeout=15,
        )
        if resp.status_code == 401:
            logger.error("Token inválido (401). Verifique WORKER_TOKEN no .env")
            return None
        resp.raise_for_status()
        data = resp.json()
        return data if data.get("id") else None
    except requests.RequestException as exc:
        logger.error("Erro ao buscar job: %s", exc)
        return None


def enviar_resultado(job_id: str, success: bool, result: Dict[str, Any], error: str = "") -> None:
    """Envia resultado de um job para /api/worker/jobs/{job_id}/result."""
    body = {"success": success, "result": result, "error": error}
    try:
        resp = requests.post(
            f"{RAILWAY_API_URL}/api/worker/jobs/{job_id}/result",
            json=body,
            headers=_worker_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        logger.info("Resultado enviado. status=%s boletos=%s",
                    resp.json().get("status"), resp.json().get("boletos_persistidos"))
    except requests.RequestException as exc:
        logger.error("Falha ao enviar resultado para Railway: %s", exc)


# ──────────────────────────────────────────────────────────────────────────────
#  Upload para Supabase Storage
# ──────────────────────────────────────────────────────────────────────────────

def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _supabase_headers(content_type: Optional[str] = None) -> Dict[str, str]:
    h = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    if content_type:
        h["Content-Type"] = content_type
    return h


def _ensure_bucket(bucket: str) -> None:
    resp = requests.get(f"{SUPABASE_URL}/storage/v1/bucket/{bucket}",
                        headers=_supabase_headers(), timeout=20)
    if resp.status_code == 200:
        return
    if resp.status_code == 404:
        create = requests.post(
            f"{SUPABASE_URL}/storage/v1/bucket",
            headers=_supabase_headers("application/json"),
            json={"id": bucket, "name": bucket, "public": False, "file_size_limit": 10485760},
            timeout=20,
        )
        if create.status_code not in {200, 201, 409}:
            logger.warning("Falha ao criar bucket %s: %s", bucket, create.text[:200])


def _signed_url(bucket: str, object_path: str) -> Optional[str]:
    from urllib.parse import quote
    encoded = quote(object_path, safe="/")
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{encoded}",
        headers=_supabase_headers("application/json"),
        json={"expiresIn": 60 * 60 * 24 * 365},
        timeout=30,
    )
    if resp.status_code >= 400:
        return None
    body = resp.json() or {}
    signed = body.get("signedURL") or body.get("signedUrl") or ""
    if signed.startswith("http"):
        return signed
    if signed.startswith("/"):
        return f"{SUPABASE_URL}{signed}"
    return None


def upload_para_supabase(local_path: str, job: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """Faz upload de um PDF para o Supabase Storage e retorna metadados."""
    from urllib.parse import quote
    import re

    op = job.get("operadora") or {}
    bucket = (job.get("supabase") or {}).get("bucket") or SUPABASE_BUCKET

    def slug(val: Any, fb: str = "arquivo") -> str:
        text = re.sub(r"[^a-z0-9._-]+", "-", str(val or fb).strip().lower())
        return text.strip("-_") or fb

    now = datetime.datetime.utcnow()
    op_slug = slug(op.get("nome"), "operadora")
    apolice_slug = slug(job.get("apolice_id"), "apolice")
    comp_slug = now.strftime("%Y-%m")
    filename = f"boleto_{op_slug}_{apolice_slug}_{comp_slug}_{now.strftime('%Y%m%d_%H%M%S')}_{idx + 1}.pdf"
    object_path = f"rpa/{op_slug}/{apolice_slug}/{comp_slug}/{filename}"

    size = Path(local_path).stat().st_size if Path(local_path).exists() else 0
    base = {
        "local_path": local_path,
        "filename": filename,
        "nome_arquivo": filename,
        "content_type": "application/pdf",
        "size": size,
        "tamanho_bytes": size,
        "operadora": op.get("nome", "Operadora"),
        "apolice_id": job.get("apolice_id", ""),
        "user_id": job.get("user_id", ""),
        "sha256": _sha256(local_path),
    }

    supa_url = (job.get("supabase") or {}).get("url") or SUPABASE_URL
    supa_key = (job.get("supabase") or {}).get("serviceRoleKey") or SUPABASE_KEY

    if not supa_url or not supa_key:
        logger.warning("Supabase não configurado. PDF salvo apenas localmente: %s", local_path)
        return {**base, "status": "local_only", "upload_error": "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado."}

    try:
        _ensure_bucket(bucket)
        encoded = quote(object_path, safe="/")
        upload_url = f"{supa_url}/storage/v1/object/{bucket}/{encoded}"
        up_headers = {
            "apikey": supa_key,
            "Authorization": f"Bearer {supa_key}",
            "Content-Type": "application/pdf",
            "x-upsert": "true",
            "cache-control": "3600",
        }
        with open(local_path, "rb") as fh:
            resp = requests.post(upload_url, headers=up_headers, data=fh, timeout=60)
        if resp.status_code >= 400:
            with open(local_path, "rb") as fh:
                resp = requests.put(upload_url, headers=up_headers, data=fh, timeout=60)
        if resp.status_code >= 400:
            raise RuntimeError(f"{resp.status_code} {resp.text[:400]}")

        public_url = f"{supa_url}/storage/v1/object/public/{bucket}/{encoded}"
        signed = _signed_url(bucket, object_path) or public_url
        logger.info("Upload OK → bucket=%s path=%s", bucket, object_path)
        return {
            **base,
            "status": "uploaded",
            "bucket": bucket,
            "storage_bucket": bucket,
            "path": object_path,
            "storage_path": object_path,
            "public_url": signed,
            "signed_url": signed,
            "arquivo_url": signed,
            "raw_public_url": public_url,
        }
    except Exception as exc:
        logger.exception("Falha no upload para Supabase")
        return {**base, "status": "upload_failed", "upload_error": str(exc)}


# ──────────────────────────────────────────────────────────────────────────────
#  Motor Playwright (importado do rpa_service_example.py com adaptações)
# ──────────────────────────────────────────────────────────────────────────────

def executar_playwright(job: Dict[str, Any]) -> List[str]:
    """Executa o fluxo Playwright localmente e retorna lista de caminhos de PDFs."""
    if not PLAYWRIGHT_OK:
        raise RuntimeError("Playwright não está instalado. Rode: playwright install chromium")

    op: Dict[str, Any] = job.get("operadora") or {}
    url_portal = op.get("url") or ""
    usuario = op.get("usuario") or ""
    senha = op.get("senha") or ""

    if not url_portal:
        raise ValueError("Operadora sem URL configurada")
    if not usuario:
        raise ValueError("Operadora sem usuário configurado")
    if not senha:
        raise ValueError("Operadora sem senha configurada")

    def _sel(key: str, fallback: str) -> str:
        return (op.get("selectors") or {}).get(key) or fallback

    user_sel = _sel("usuario", "input[name='login'], input#login, input[name='usuario'], input#usuario, input[type='text']")
    pass_sel = _sel("senha", "input[name='password'], input[name='senha'], input#senha, input[type='password']")
    submit_sel = _sel("entrar", "button[type='submit'], input[type='submit'], button:has-text('Entrar'), a:has-text('Entrar')")
    max_dl = int(op.get("maxDownloads", 1))
    dl_timeout = int(op.get("downloadTimeoutMs", 60000))
    login_wait = int(op.get("loginWaitMs", 7000))

    files_downloaded: List[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,  # visível para debug; mude para True se quiser em background
            args=["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1366,768"],
        )
        context = browser.new_context(
            accept_downloads=True,
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
        )
        page = context.new_page()
        try:
            logger.info("Abrindo portal: %s", url_portal)
            page.goto(url_portal, wait_until="domcontentloaded", timeout=60000)

            # Aguardar carregamento inicial
            try:
                page.wait_for_load_state("networkidle", timeout=25000)
            except Exception:
                pass
            page.wait_for_timeout(int(op.get("initialWaitMs", 5000)))

            # Etapas pré-login opcionais
            for step in (op.get("preLoginSteps") or []):
                _run_step(page, step)

            # Preencher usuário
            _fill_field(page, user_sel, usuario, "usuário", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Usuário preenchido")

            # Preencher senha
            _fill_field(page, pass_sel, senha, "senha", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Senha preenchida")

            # Clicar entrar
            _click_field(page, submit_sel, "entrar", timeout_ms=int(op.get("fieldTimeoutMs", 60000)))
            logger.info("Login enviado")

            # Aguardar pós-login
            try:
                page.wait_for_load_state("networkidle", timeout=60000)
            except Exception:
                pass
            page.wait_for_timeout(login_wait)
            logger.info("Login concluído")

            # Etapas pós-login (navegação até boleto)
            for step in (op.get("steps") or []):
                _run_step(page, step)

            # Tentar download genérico
            boleto_sel = _sel("boleto", "a[href*='boleto'], a[href*='segunda-via'], a[href*='2via'], button:has-text('Boleto'), a:has-text('Boleto')")
            locators = page.locator(boleto_sel).all()
            logger.info("Candidatos de boleto encontrados: %d", len(locators))

            for idx, loc in enumerate(locators):
                if len(files_downloaded) >= max_dl:
                    break
                try:
                    with page.expect_download(timeout=dl_timeout) as dl_info:
                        loc.click(timeout=10000, force=True)
                    dl = dl_info.value
                    fd, path = tempfile.mkstemp(prefix=f"boleto_{job.get('apolice_id', '')}_{idx}_", suffix=".pdf")
                    os.close(fd)
                    dl.save_as(path)
                    files_downloaded.append(path)
                    logger.info("PDF baixado: %s", path)
                except Exception as exc:
                    logger.warning("Candidato %d não gerou download: %s", idx + 1, exc)

            if not files_downloaded:
                raise RuntimeError("Nenhum PDF foi baixado após percorrer todos os candidatos de boleto.")

        finally:
            context.close()
            browser.close()

    return files_downloaded


def _find_locator(page, selector: str, timeout_ms: int):
    """Retorna o primeiro locator visível dentre os seletores (separados por vírgula)."""
    deadline = time.time() + timeout_ms / 1000
    items = [s.strip() for s in selector.split(",") if s.strip()]
    while time.time() < deadline:
        for item in items:
            try:
                loc = page.locator(item).first
                if loc.count() > 0 and loc.is_visible(timeout=500):
                    return loc
            except Exception:
                pass
        page.wait_for_timeout(300)
    return None


def _fill_field(page, selector: str, value: str, label: str, timeout_ms: int = 60000) -> None:
    loc = _find_locator(page, selector, timeout_ms)
    if loc is None:
        raise RuntimeError(f"Campo '{label}' não encontrado com seletor: {selector}")
    loc.fill(value, timeout=timeout_ms)


def _click_field(page, selector: str, label: str, timeout_ms: int = 60000) -> None:
    loc = _find_locator(page, selector, timeout_ms)
    if loc is None:
        raise RuntimeError(f"Botão/link '{label}' não encontrado com seletor: {selector}")
    loc.click(timeout=timeout_ms, force=True)


def _run_step(page, step: Dict[str, Any]) -> None:
    action = step.get("action")
    selector = step.get("selector")
    value = str(step.get("value", ""))
    timeout = int(step.get("timeout", 30000))
    if action == "click" and selector:
        _click_field(page, selector, "etapa-config", timeout)
    elif action == "fill" and selector:
        _fill_field(page, selector, value, "etapa-config", timeout)
    elif action in {"wait", "wait_timeout"}:
        page.wait_for_timeout(int(step.get("ms", 1000)))
    elif action == "goto" and value:
        page.goto(value, wait_until="domcontentloaded", timeout=timeout)


# ──────────────────────────────────────────────────────────────────────────────
#  Loop principal
# ──────────────────────────────────────────────────────────────────────────────

def validar_config() -> bool:
    ok = True
    if not RAILWAY_API_URL:
        logger.error("RAILWAY_API_URL não definida no .env")
        ok = False
    if not WORKER_TOKEN:
        logger.error("WORKER_TOKEN não definido no .env")
        ok = False
    if not PLAYWRIGHT_OK:
        logger.warning("Playwright não instalado — jobs irão falhar")
    return ok


def processar_job(job: Dict[str, Any]) -> None:
    job_id = job["id"]
    logger.info("─── Iniciando job %s (operadora=%s) ───", job_id, (job.get("operadora") or {}).get("nome"))
    start = time.time()

    try:
        local_files = executar_playwright(job)
        logger.info("Playwright concluído: %d arquivo(s)", len(local_files))

        uploaded: List[Dict[str, Any]] = []
        for idx, path in enumerate(local_files):
            item = upload_para_supabase(path, job, idx)
            uploaded.append(item)
            # Tentar remover o PDF temporário após upload
            try:
                os.unlink(path)
            except Exception:
                pass

        upload_failures = [i for i in uploaded if i.get("status") not in {"uploaded"}]
        result = {
            "status": "success" if not upload_failures else "success_with_upload_warning",
            "message": "RPA worker executou com sucesso." if not upload_failures else "PDFs gerados, mas houve aviso no upload para Supabase.",
            "processed": len(local_files),
            "duration_seconds": round(time.time() - start, 2),
            "user_id": job.get("user_id", ""),
            "apolice_id": job.get("apolice_id", ""),
            "operadora": (job.get("operadora") or {}).get("nome", "Operadora"),
            "uploaded_files": uploaded,
        }
        enviar_resultado(job_id, success=True, result=result)
        logger.info("Job %s concluído em %.1fs", job_id, time.time() - start)

    except Exception as exc:
        elapsed = round(time.time() - start, 2)
        logger.exception("Job %s falhou após %.1fs", job_id, elapsed)
        enviar_resultado(job_id, success=False, result={}, error=str(exc))


def main() -> None:
    logger.info("=" * 60)
    logger.info("  Doncor RPA Worker Local  —  iniciando")
    logger.info("  Railway API : %s", RAILWAY_API_URL or "(NÃO CONFIGURADO)")
    logger.info("  Playwright  : %s", "OK" if PLAYWRIGHT_OK else "NÃO INSTALADO")
    logger.info("  Poll interval: %ds", POLL_INTERVAL)
    logger.info("=" * 60)

    if not validar_config():
        logger.error("Configuração inválida. Edite rpa_worker/.env e tente novamente.")
        sys.exit(1)

    logger.info("Worker pronto. Aguardando jobs... (Ctrl+C para parar)")
    while True:
        try:
            job = buscar_proximo_job()
            if job:
                processar_job(job)
            else:
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            logger.info("Worker encerrado pelo usuário.")
            break
        except Exception as exc:
            logger.error("Erro inesperado no loop principal: %s", exc)
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
