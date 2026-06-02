"""Rotas do Portal DonCor para parceiros/empresas.

O portal usa o CNPJ da empresa ou CPF do beneficiário como chave de acesso e
filtra contratos, faturas, boletos e mensagens para esse documento.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import Body, HTTPException, Query


def _digits(value: Any) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _money_to_float(value: Any) -> float:
    text = str(value or "0")
    text = re.sub(r"[^0-9,.-]", "", text)
    if not text:
        return 0.0
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    try:
        return float(text)
    except Exception:
        return 0.0


def _format_brl(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_br() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


async def _all(collection, sort_field: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
    cursor = collection.find({}, {"_id": 0})
    if sort_field:
        cursor = cursor.sort(sort_field, -1)
    return await cursor.to_list(limit)


async def _find_partner_context(db, documento: str) -> Dict[str, Any]:
    doc = _digits(documento)
    if len(doc) < 11:
        raise HTTPException(status_code=400, detail="Informe um CPF ou CNPJ válido.")

    contratos_emp = await _all(db.contratos_empresarial)
    contratos_adh = await _all(db.contratos_adesao)
    inclusoes = await _all(db.inclusoes)
    exclusoes = await _all(db.exclusoes)
    transferencias = await _all(db.transferencias)

    contratos: List[Dict[str, Any]] = []
    empresa = ""
    nome = ""
    tipo = "cpf" if len(doc) <= 11 else "cnpj"

    if len(doc) > 11:
        contratos = [item for item in contratos_emp if _digits(item.get("cnpj")) == doc]
        if contratos:
            empresa = contratos[0].get("empresa") or "Empresa"
            nome = empresa
    else:
        contrato_numeros = set()
        for item in inclusoes + exclusoes:
            if _digits(item.get("cpf")) == doc:
                contrato_numeros.add(item.get("contrato"))
                nome = nome or item.get("beneficiario") or "Beneficiário"
                empresa = empresa or item.get("empresa") or ""
        for item in transferencias:
            if _digits(item.get("cpf")) == doc:
                contrato_numeros.add(item.get("contratoOrigem"))
                contrato_numeros.add(item.get("contratoDestino"))
                nome = nome or item.get("beneficiario") or "Beneficiário"

        contratos = [item for item in contratos_emp + contratos_adh if item.get("numero") in contrato_numeros]
        if contratos and not empresa:
            empresa = contratos[0].get("empresa") or "Beneficiário"

    if not contratos:
        raise HTTPException(status_code=404, detail="Nenhum contrato encontrado para este CPF/CNPJ.")

    contrato_numeros = [item.get("numero") for item in contratos if item.get("numero")]
    return {
        "documento": doc,
        "tipo": tipo,
        "nome": nome or empresa or "Parceiro",
        "empresa": empresa or nome or "Parceiro",
        "contratos": contratos,
        "contratoNumeros": contrato_numeros,
    }


async def _portal_payload(db, documento: str) -> Dict[str, Any]:
    ctx = await _find_partner_context(db, documento)
    contrato_numeros = set(ctx["contratoNumeros"])

    faturas = [item for item in await _all(db.faturas) if item.get("contrato") in contrato_numeros]
    boletos_all = await _all(db.boletos_baixados, "createdAt", 300)
    boletos = []
    for item in boletos_all:
        values = " ".join(str(item.get(key) or "") for key in ["apolice_id", "contrato", "arquivo_path", "storage_path", "arquivo_nome", "nome_arquivo"])
        if any(numero and numero in values for numero in contrato_numeros):
            boletos.append(item)

    total = sum(_money_to_float(item.get("valor")) for item in faturas)
    aberto = sum(_money_to_float(item.get("valor")) for item in faturas if str(item.get("status", "")).lower() in {"aberta", "aberto"})
    vencido = sum(_money_to_float(item.get("valor")) for item in faturas if str(item.get("status", "")).lower() == "vencida")
    pago = sum(_money_to_float(item.get("valorPago") or item.get("valor")) for item in faturas if str(item.get("status", "")).lower() == "paga")
    vidas = sum(int(item.get("vidas") or 0) for item in ctx["contratos"])

    por_competencia: Dict[str, float] = {}
    for item in faturas:
        competencia = item.get("competencia") or "Sem competência"
        por_competencia[competencia] = por_competencia.get(competencia, 0) + _money_to_float(item.get("valor"))

    return {
        "parceiro": {
            "documento": ctx["documento"],
            "tipo": ctx["tipo"],
            "nome": ctx["nome"],
            "empresa": ctx["empresa"],
            "contratos": ctx["contratoNumeros"],
        },
        "resumo": {
            "contratos": len(ctx["contratos"]),
            "vidas": vidas,
            "faturas": len(faturas),
            "boletos": len(boletos),
            "totalFaturado": _format_brl(total),
            "totalAberto": _format_brl(aberto),
            "totalVencido": _format_brl(vencido),
            "totalPago": _format_brl(pago),
        },
        "contratos": ctx["contratos"],
        "faturas": faturas,
        "boletos": boletos,
        "analitico": [
            {"competencia": key, "valor": _format_brl(value), "valorNumerico": value}
            for key, value in sorted(por_competencia.items())
        ],
    }


def attach_portal_routes(app, db, _proj: Callable | None = None, _now_iso_func: Callable | None = None, _now_br_func: Callable | None = None) -> None:
    now_iso = _now_iso_func or _now_iso
    now_br = _now_br_func or _now_br

    @app.post("/api/portal-doncor/login")
    async def portal_doncor_login(payload: Dict[str, Any] = Body(...)):
        documento = payload.get("documento") or payload.get("cpfCnpj") or payload.get("cpf_cnpj")
        context = await _find_partner_context(db, documento)
        return {
            "token": str(uuid.uuid4()),
            "documento": context["documento"],
            "tipo": context["tipo"],
            "nome": context["nome"],
            "empresa": context["empresa"],
            "contratos": context["contratoNumeros"],
        }

    @app.get("/api/portal-doncor/resumo")
    async def portal_doncor_resumo(documento: str = Query(...)):
        return await _portal_payload(db, documento)

    @app.get("/api/portal-doncor/chat")
    async def portal_doncor_chat(documento: str = "", empresa: str = "", limit: int = Query(default=100, ge=1, le=300)):
        items = await _all(db.portal_chat, "createdAt", limit)
        doc = _digits(documento)
        empresa_norm = str(empresa or "").strip().lower()
        if doc:
            items = [item for item in items if _digits(item.get("documento")) == doc]
        if empresa_norm:
            items = [item for item in items if str(item.get("empresa") or item.get("company") or "").strip().lower() == empresa_norm]
        return sorted(items, key=lambda item: item.get("createdAt") or "")

    @app.post("/api/portal-doncor/chat")
    async def portal_doncor_chat_send(payload: Dict[str, Any] = Body(...)):
        documento = _digits(payload.get("documento"))
        empresa = str(payload.get("empresa") or payload.get("company") or "Parceiro").strip()
        text = str(payload.get("text") or payload.get("mensagem") or "").strip()
        attachment_name = str(payload.get("attachmentName") or payload.get("anexoNome") or "").strip()
        if not text and not attachment_name:
            raise HTTPException(status_code=400, detail="Digite uma mensagem ou anexe um documento.")

        sender_role = str(payload.get("senderRole") or payload.get("origem") or "portal").lower()
        direction = "incoming" if sender_role in {"portal", "empresa", "parceiro"} else "outgoing"
        item = {
            "id": str(uuid.uuid4()),
            "documento": documento,
            "empresa": empresa,
            "company": empresa,
            "text": text,
            "attachmentName": attachment_name,
            "attachmentSize": payload.get("attachmentSize") or 0,
            "sender": payload.get("sender") or empresa,
            "senderRole": sender_role,
            "direction": direction,
            "read": direction == "outgoing",
            "createdAt": now_iso(),
            "criadoEm": now_br(),
        }
        await db.portal_chat.insert_one(item)
        return item
