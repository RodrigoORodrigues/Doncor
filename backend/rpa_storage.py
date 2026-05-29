"""Upload de arquivos do RPA para o Supabase Storage.

Este módulo fica separado para permitir commits pequenos e evitar alterar o fluxo Playwright.
"""

from __future__ import annotations

import datetime
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)


def _slug(value: Any, fallback: str = "arquivo") -> str:
    text = str(value or fallback).strip().lower()
    text = re.sub(r"[^a-z0-9._-]+", "-", text)
    return text.strip("-_") or fallback


def _infer_competencia(operadora: Dict[str, Any]) -> str:
    raw = str(
        operadora.get("competencia")
        or operadora.get("mesAno")
        or operadora.get("mes_ano")
        or operadora.get("periodo")
        or ""
    ).strip()
    if raw:
        return raw

    mes = str(operadora.get("mes") or operadora.get("mesBoleto") or operadora.get("boletoMes") or "").strip()
    ano = str(operadora.get("ano") or operadora.get("anoBoleto") or operadora.get("boletoAno") or "").strip()
    if mes and ano:
        if len(ano) == 2:
            ano = "20" + ano
        return f"{mes.zfill(2)[-2:]}/{ano}"

    today = datetime.datetime.now()
    month = today.month + 1
    year = today.year
    if month > 12:
        month = 1
        year += 1
    return f"{month:02d}/{year}"


def _supabase_settings(payload: Any) -> Dict[str, str]:
    cfg = getattr(payload, "supabase", None) or {}
    return {
        "url": str(cfg.get("url") or os.getenv("SUPABASE_URL") or "").rstrip("/"),
        "key": str(
            cfg.get("serviceRoleKey")
            or cfg.get("service_role_key")
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_SERVICE_KEY")
            or ""
        ),
        "bucket": str(cfg.get("bucket") or os.getenv("SUPABASE_BUCKET_BOLETOS") or "boletos"),
    }


def _headers(key: str, content_type: Optional[str] = None) -> Dict[str, str]:
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _ensure_bucket(base_url: str, key: str, bucket: str) -> None:
    response = requests.get(f"{base_url}/storage/v1/bucket/{bucket}", headers=_headers(key), timeout=20)
    if response.status_code == 200:
        return
    if response.status_code != 404:
        logger.warning("Supabase Storage: falha ao verificar bucket %s: %s %s", bucket, response.status_code, response.text[:300])
        return

    create = requests.post(
        f"{base_url}/storage/v1/bucket",
        headers=_headers(key, "application/json"),
        json={"id": bucket, "name": bucket, "public": False, "file_size_limit": 10485760},
        timeout=20,
    )
    if create.status_code not in {200, 201, 409}:
        logger.warning("Supabase Storage: falha ao criar bucket %s: %s %s", bucket, create.status_code, create.text[:300])


def _signed_url(base_url: str, key: str, bucket: str, object_path: str) -> Optional[str]:
    encoded_path = quote(object_path, safe="/")
    response = requests.post(
        f"{base_url}/storage/v1/object/sign/{bucket}/{encoded_path}",
        headers=_headers(key, "application/json"),
        json={"expiresIn": 60 * 60 * 24 * 365},
        timeout=30,
    )
    if response.status_code >= 400:
        logger.warning("Supabase Storage: falha ao gerar URL assinada: %s %s", response.status_code, response.text[:300])
        return None

    body = response.json() or {}
    signed = body.get("signedURL") or body.get("signedUrl")
    if not signed:
        return None
    if signed.startswith("http://") or signed.startswith("https://"):
        return signed
    if signed.startswith("/storage/"):
        return f"{base_url}{signed}"
    if signed.startswith("/object/"):
        return f"{base_url}/storage/v1{signed}"
    if signed.startswith("/"):
        return f"{base_url}{signed}"
    return f"{base_url}/storage/v1/{signed}"


def upload_file_to_supabase(local_path: str, payload: Any, idx: int = 0) -> Dict[str, Any]:
    settings = _supabase_settings(payload)
    operadora = getattr(payload, "operadora", {}) or {}
    apolice_id = getattr(payload, "apolice_id", "")
    user_id = getattr(payload, "user_id", "")

    file_path = Path(local_path)
    size = file_path.stat().st_size if file_path.exists() else 0
    now = datetime.datetime.utcnow()
    filename = (
        f"boleto_{_slug(operadora.get('nome'), 'operadora')}_"
        f"{_slug(apolice_id, 'apolice')}_{now.strftime('%Y%m%d_%H%M%S')}_{idx + 1}.pdf"
    )
    object_path = f"rpa/{_slug(operadora.get('nome'), 'operadora')}/{_slug(apolice_id, 'apolice')}/{filename}"

    base = {
        "local_path": local_path,
        "filename": filename,
        "nome_arquivo": filename,
        "content_type": "application/pdf",
        "size": size,
        "tamanho_bytes": size,
        "operadora": operadora.get("nome", "Operadora"),
        "apolice_id": apolice_id,
        "user_id": user_id,
        "competencia": _infer_competencia(operadora),
    }

    if not settings["url"] or not settings["key"]:
        return {**base, "status": "local_only", "upload_error": "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado."}

    try:
        _ensure_bucket(settings["url"], settings["key"], settings["bucket"])
        encoded_path = quote(object_path, safe="/")
        upload_url = f"{settings['url']}/storage/v1/object/{settings['bucket']}/{encoded_path}"

        with open(local_path, "rb") as file:
            response = requests.post(
                upload_url,
                headers={**_headers(settings["key"], "application/pdf"), "x-upsert": "true", "cache-control": "3600"},
                data=file,
                timeout=60,
            )

        if response.status_code >= 400:
            with open(local_path, "rb") as file:
                response = requests.put(
                    upload_url,
                    headers={**_headers(settings["key"], "application/pdf"), "x-upsert": "true", "cache-control": "3600"},
                    data=file,
                    timeout=60,
                )

        if response.status_code >= 400:
            raise RuntimeError(f"{response.status_code} {response.text[:500]}")

        public_url = f"{settings['url']}/storage/v1/object/public/{settings['bucket']}/{encoded_path}"
        signed_url = _signed_url(settings["url"], settings["key"], settings["bucket"], object_path)
        usable_url = signed_url or public_url

        logger.info("Supabase Storage: boleto enviado para bucket=%s path=%s", settings["bucket"], object_path)
        return {
            **base,
            "status": "uploaded",
            "bucket": settings["bucket"],
            "storage_bucket": settings["bucket"],
            "path": object_path,
            "storage_path": object_path,
            "public_url": usable_url,
            "signed_url": signed_url,
            "arquivo_url": usable_url,
            "raw_public_url": public_url,
        }
    except Exception as exc:
        logger.exception("Falha ao enviar boleto para Supabase Storage")
        return {
            **base,
            "status": "upload_failed",
            "bucket": settings["bucket"],
            "storage_bucket": settings["bucket"],
            "path": object_path,
            "storage_path": object_path,
            "upload_error": str(exc),
        }


def upload_files_to_supabase(files: List[str], payload: Any) -> List[Dict[str, Any]]:
    return [upload_file_to_supabase(path, payload, idx) for idx, path in enumerate(files)]
