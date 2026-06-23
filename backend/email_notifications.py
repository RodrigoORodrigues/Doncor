"""Email notifications used by portal chat flows."""

from __future__ import annotations

import html
import logging
import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any, Iterable

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    value = str(os.getenv(name, "")).strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "sim", "on", "verdadeiro", "ativado", "ativo"}


def normalize_recipients(values: Iterable[Any]) -> list[str]:
    recipients: list[str] = []
    seen: set[str] = set()
    for value in values:
        if isinstance(value, str):
            candidates = re.split(r"[,;]", value)
        else:
            candidates = [str(value or "")]
        for candidate in candidates:
            email = candidate.strip()
            key = email.lower()
            if email and key not in seen:
                recipients.append(email)
                seen.add(key)
    return recipients


def get_corretor_notification_recipients() -> list[str]:
    return normalize_recipients([os.getenv("CORRETOR_NOTIFICATION_EMAIL")])


def _attachment_names(chat_item: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for attachment in chat_item.get("attachments") or []:
        if isinstance(attachment, dict):
            name = str(attachment.get("name") or attachment.get("nome") or "").strip()
        else:
            name = str(attachment or "").strip()
        if name:
            names.append(name)

    attachment_name = str(chat_item.get("attachmentName") or "").strip()
    if attachment_name:
        names.extend(item.strip() for item in re.split(r"[,;]", attachment_name) if item.strip())

    return normalize_recipients(names)


def build_chat_notification_body(chat_item: dict[str, Any]) -> tuple[str, str]:
    empresa = str(chat_item.get("empresa") or chat_item.get("company") or "Cliente").strip()
    documento = str(chat_item.get("documento") or "-").strip() or "-"
    sender = str(chat_item.get("sender") or "Portal DonCor").strip()
    created_at = str(chat_item.get("criadoEm") or chat_item.get("createdAt") or "").strip()
    text = str(chat_item.get("text") or "").strip() or "Mensagem enviada com anexo."
    attachment_names = _attachment_names(chat_item)

    attachment_lines = "\n".join(f"- {name}" for name in attachment_names) if attachment_names else "-"
    plain = (
        "Nova mensagem no chat DonCor.\n\n"
        f"Empresa: {empresa}\n"
        f"Documento: {documento}\n"
        f"Remetente: {sender}\n"
        f"Data: {created_at or '-'}\n\n"
        "Mensagem:\n"
        f"{text}\n\n"
        "Anexos informados:\n"
        f"{attachment_lines}\n\n"
        "Acesse o portal para responder e visualizar os detalhes."
    )

    html_attachments = "".join(f"<li>{html.escape(name)}</li>" for name in attachment_names) or "<li>-</li>"
    html_body = (
        "<p>Nova mensagem no chat DonCor.</p>"
        "<table>"
        f"<tr><td><strong>Empresa</strong></td><td>{html.escape(empresa)}</td></tr>"
        f"<tr><td><strong>Documento</strong></td><td>{html.escape(documento)}</td></tr>"
        f"<tr><td><strong>Remetente</strong></td><td>{html.escape(sender)}</td></tr>"
        f"<tr><td><strong>Data</strong></td><td>{html.escape(created_at or '-')}</td></tr>"
        "</table>"
        f"<p><strong>Mensagem</strong></p><p>{html.escape(text).replace(chr(10), '<br>')}</p>"
        f"<p><strong>Anexos informados</strong></p><ul>{html_attachments}</ul>"
        "<p>Acesse o portal para responder e visualizar os detalhes.</p>"
    )
    return plain, html_body


def send_chat_notification_email(recipients: Iterable[str], chat_item: dict[str, Any]) -> dict[str, Any]:
    notifications_enabled = (
        _env_bool("EMAIL_NOTIFICATIONS_ENABLED", False) or
        _env_bool("NOTIFICACOES_DE_EMAIL_ATIVADAS", False) or
        _env_bool("NOTIFICACOES_EMAIL_ATIVADAS", False) or
        _env_bool("NOTIFICAÇÕES_DE_EMAIL_ATIVADAS", False)
    )
    if not notifications_enabled:
        logger.info("Email notifications disabled; chat notification skipped.")
        return {"sent": False, "reason": "disabled"}

    recipient_list = normalize_recipients(recipients)
    if not recipient_list:
        logger.info("Chat notification skipped because no recipient was found.")
        return {"sent": False, "reason": "no_recipients"}

    host = str(os.getenv("SMTP_HOST") or "").strip()
    try:
        port_val = os.getenv("SMTP_PORT") or os.getenv("PORTA_SMTP") or "587"
        port = int(str(port_val).strip())
    except ValueError:
        logger.warning("Invalid SMTP_PORT/PORTA_SMTP value; using 587.")
        port = 587
    username = str(os.getenv("SMTP_USERNAME") or "").strip()
    password = str(os.getenv("SMTP_PASSWORD") or os.getenv("SENHA_SMTP") or "")
    from_email = str(os.getenv("SMTP_FROM_EMAIL") or os.getenv("SMTP_DE_EMAIL") or "").strip()
    from_name = str(os.getenv("SMTP_FROM_NAME") or "DonCor").strip() or "DonCor"

    if not host or not from_email:
        logger.warning("Chat notification skipped because SMTP_HOST or SMTP_FROM_EMAIL is missing.")
        return {"sent": False, "reason": "smtp_not_configured"}

    empresa = str(chat_item.get("empresa") or chat_item.get("company") or "cliente").strip()
    subject = f"DonCor - nova mensagem no chat de {empresa}"
    plain_body, html_body = build_chat_notification_body(chat_item)

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((from_name, from_email))
    message["To"] = ", ".join(recipient_list)
    message.set_content(plain_body)
    message.add_alternative(html_body, subtype="html")

    try:
        if port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as smtp:
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                if username and password:
                    smtp.login(username, password)
                smtp.send_message(message)
    except Exception as exc:
        logger.exception("Failed to send chat notification email: %s", exc.__class__.__name__)
        return {"sent": False, "reason": "smtp_error"}

    logger.info("Chat notification email sent to %d recipient(s).", len(recipient_list))
    return {"sent": True, "recipients": len(recipient_list)}
