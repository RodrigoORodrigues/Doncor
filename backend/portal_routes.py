"""Rotas do Portal DonCor para parceiros/empresas.

O portal usa o CNPJ da empresa ou CPF do beneficiário como chave de acesso e
filtra contratos, faturas, boletos e mensagens para esse documento.
"""

from __future__ import annotations

import base64
import hashlib
import os
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


def _portal_protocol(seq: int) -> str:
    return f"CLI-{seq:04d}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_br() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


async def _all(collection, sort_field: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
    cursor = collection.find({}, {"_id": 0})
    if sort_field:
        cursor = cursor.sort(sort_field, -1)
    return await cursor.to_list(limit)


def _encode_secret(secret: str, salt_b64: str) -> str:
    salt = base64.b64decode(salt_b64.encode("ascii"))
    digest = hashlib.pbkdf2_hmac("sha256", str(secret).encode("utf-8"), salt, 160000)
    return base64.b64encode(digest).decode("ascii")


def _set_access_secret(item: Dict[str, Any], secret: str, now_iso: Callable) -> None:
    secret = str(secret or "")
    if len(secret) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")
    salt_b64 = base64.b64encode(os.urandom(16)).decode("ascii")
    item["accessSalt"] = salt_b64
    item["accessDigest"] = _encode_secret(secret, salt_b64)
    item["senhaDefinida"] = True
    item["senhaAtualizadaEm"] = now_iso()


def _check_access_secret(partner: Dict[str, Any], secret: str) -> bool:
    salt_b64 = partner.get("accessSalt") or ""
    digest = partner.get("accessDigest") or ""
    if not salt_b64 or not digest:
        return False
    return _encode_secret(str(secret or ""), salt_b64) == digest


def _public_partner(item: Dict[str, Any]) -> Dict[str, Any]:
    public = dict(item or {})
    public.pop("accessDigest", None)
    public.pop("accessSalt", None)
    public["senhaDefinida"] = bool(item.get("accessDigest") and item.get("accessSalt"))
    return public


def _normalize_partner_payload(payload: Dict[str, Any], now_iso: Callable, now_br: Callable, existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    documento = _digits(payload.get("documento") or payload.get("cpfCnpj") or payload.get("cpf_cnpj"))
    if len(documento) not in {11, 14}:
        raise HTTPException(status_code=400, detail="Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.")

    raw_contracts = payload.get("contratos") or payload.get("contratoNumeros") or payload.get("contratosVinculados") or []
    if isinstance(raw_contracts, str):
        contratos = [item.strip() for item in re.split(r"[,;\n]", raw_contracts) if item.strip()]
    else:
        contratos = [str(item).strip() for item in raw_contracts if str(item).strip()]

    item = {
        "documento": documento,
        "tipo": "CPF" if len(documento) == 11 else "CNPJ",
        "nome": str(payload.get("nome") or payload.get("empresa") or payload.get("razaoSocial") or "").strip(),
        "empresa": str(payload.get("empresa") or payload.get("nome") or payload.get("razaoSocial") or "").strip(),
        "email": str(payload.get("email") or "").strip(),
        "telefone": str(payload.get("telefone") or "").strip(),
        "contratos": contratos,
        "status": str(payload.get("status") or "Ativo").strip() or "Ativo",
        "observacoes": str(payload.get("observacoes") or payload.get("observação") or "").strip(),
        "updatedAt": now_iso(),
        "atualizadoEm": now_br(),
    }

    if existing:
        item["id"] = existing.get("id") or str(uuid.uuid4())
        item["createdAt"] = existing.get("createdAt") or now_iso()
        item["criadoEm"] = existing.get("criadoEm") or now_br()
        item["accessSalt"] = existing.get("accessSalt")
        item["accessDigest"] = existing.get("accessDigest")
        item["senhaDefinida"] = bool(existing.get("accessDigest") and existing.get("accessSalt"))
        item["senhaAtualizadaEm"] = existing.get("senhaAtualizadaEm")
        item["primeiroAcessoEm"] = existing.get("primeiroAcessoEm")
        item["ultimoAcessoEm"] = existing.get("ultimoAcessoEm")
    else:
        item["id"] = str(uuid.uuid4())
        item["createdAt"] = now_iso()
        item["criadoEm"] = now_br()

    secret = payload.get("senha") or payload.get("password") or payload.get("senhaPortal")
    if secret:
        _set_access_secret(item, str(secret), now_iso)
    elif not existing:
        raise HTTPException(status_code=400, detail="Cadastre uma senha de acesso para o Portal DonCor.")

    return item


async def _registered_partner(db, documento: str) -> Optional[Dict[str, Any]]:
    doc = _digits(documento)
    if not doc:
        return None
    partner = await db.portal_parceiros.find_one({"documento": doc}, {"_id": 0})
    if not partner:
        return None
    if str(partner.get("status", "Ativo")).lower() in {"inativo", "bloqueado", "cancelado"}:
        raise HTTPException(status_code=403, detail="Acesso do Portal DonCor está inativo para este CPF/CNPJ.")
    return partner


async def _find_partner_context(db, documento: str) -> Dict[str, Any]:
    doc = _digits(documento)
    if len(doc) < 11:
        raise HTTPException(status_code=400, detail="Informe um CPF ou CNPJ válido.")

    contratos_emp = await _all(db.contratos_empresarial)
    contratos_adh = await _all(db.contratos_adesao)
    inclusoes = await _all(db.inclusoes)
    exclusoes = await _all(db.exclusoes)
    transferencias = await _all(db.transferencias)
    registered = await _registered_partner(db, doc)

    contratos: List[Dict[str, Any]] = []
    empresa = ""
    nome = ""
    tipo = "cpf" if len(doc) <= 11 else "cnpj"

    if registered:
        tipo = str(registered.get("tipo") or tipo).lower()
        empresa = registered.get("empresa") or registered.get("nome") or "Parceiro"
        nome = registered.get("nome") or empresa
        registered_contracts = set(registered.get("contratos") or [])
        if registered_contracts:
            contratos = [item for item in contratos_emp + contratos_adh if item.get("numero") in registered_contracts]

    if not contratos:
        if len(doc) > 11:
            contratos = [item for item in contratos_emp if _digits(item.get("cnpj")) == doc]
            if contratos:
                empresa = empresa or contratos[0].get("empresa") or "Empresa"
                nome = nome or empresa
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

    if not contratos and not registered:
        raise HTTPException(status_code=404, detail="Nenhum cadastro ou contrato encontrado para este CPF/CNPJ.")

    contrato_numeros = [item.get("numero") for item in contratos if item.get("numero")]
    return {
        "documento": doc,
        "tipo": tipo,
        "nome": nome or empresa or "Parceiro",
        "empresa": empresa or nome or "Parceiro",
        "contratos": contratos,
        "contratoNumeros": contrato_numeros,
        "cadastroPortal": registered or None,
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

    cadastro_portal = ctx.get("cadastroPortal") or {}
    return {
        "parceiro": {
            "documento": ctx["documento"],
            "tipo": ctx["tipo"],
            "nome": ctx["nome"],
            "empresa": ctx["empresa"],
            "contratos": ctx["contratoNumeros"],
            "cadastroPortal": _public_partner(cadastro_portal) if cadastro_portal else None,
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


def _attachment_list(value: Any) -> List[Dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, list):
        value = [value]

    attachments: List[Dict[str, Any]] = []
    for item in value:
        if isinstance(item, dict):
            name = str(item.get("name") or item.get("nome") or item.get("attachmentName") or item.get("documento") or "").strip()
            if name:
                attachments.append({
                    "name": name,
                    "size": item.get("size") or item.get("tamanho") or item.get("attachmentSize") or 0,
                    "type": item.get("type") or item.get("contentType") or "",
                    "category": item.get("category") or item.get("categoria") or item.get("documento") or "",
                })
        else:
            name = str(item or "").strip()
            if name:
                attachments.append({"name": name, "size": 0, "type": "", "category": ""})
    return attachments


def _request_text(item: Dict[str, Any]) -> str:
    lines = [
        f"Nova solicitação de {item.get('tipoLabel') or item.get('tipo')} enviada pelo Portal do Cliente.",
        f"Protocolo: {item.get('protocolo')}",
        f"Empresa: {item.get('empresa')}",
        f"Contrato: {item.get('contrato') or '-'}",
    ]
    if item.get("beneficiario"):
        lines.append(f"Beneficiário: {item.get('beneficiario')}")
    if item.get("cpf"):
        lines.append(f"CPF: {item.get('cpf')}")
    if item.get("detalhes"):
        lines.append(f"Detalhes: {item.get('detalhes')}")
    return "\n".join(lines)


async def _insert_operational_request(db, tipo: str, item: Dict[str, Any], payload: Dict[str, Any]) -> None:
    base = {
        "id": str(uuid.uuid4()),
        "protocolo": item["protocolo"],
        "contrato": item.get("contrato") or "",
        "empresa": item.get("empresa") or "",
        "beneficiario": item.get("beneficiario") or "",
        "cpf": item.get("cpf") or "",
        "dataSolicitacao": item["dataEnvio"],
        "status": "Pendente",
        "origem": "portal_cliente",
        "portalSolicitacaoId": item["id"],
        "detalhes": item.get("detalhes") or "",
        "anexos": item.get("anexos") or [],
        "createdAt": item["createdAt"],
        "criadoEm": item["criadoEm"],
    }

    if tipo == "inclusao":
        await db.inclusoes.insert_one({
            **base,
            "dataNascimento": payload.get("dataNascimento") or "",
            "telefone": payload.get("telefone") or "",
            "email": payload.get("email") or "",
            "parentesco": payload.get("parentesco") or payload.get("estadoCivil") or "Titular",
            "tipoInclusao": payload.get("tipoMovimentacao") or "",
            "planos": payload.get("planos") or [],
            "operadora": payload.get("operadora") or "",
        })
    elif tipo == "exclusao":
        await db.exclusoes.insert_one({
            **base,
            "dataFim": payload.get("dataFim") or "",
            "motivo": payload.get("motivo") or item.get("detalhes") or "Solicitação do titular",
            "tipoExclusao": payload.get("tipoMovimentacao") or "",
            "planos": payload.get("planos") or [],
            "operadora": payload.get("operadora") or "",
        })


def attach_portal_routes(app, db, _proj: Callable | None = None, _now_iso_func: Callable | None = None, _now_br_func: Callable | None = None) -> None:
    now_iso = _now_iso_func or _now_iso
    now_br = _now_br_func or _now_br
    projection = _proj() if callable(_proj) else {"_id": 0}

    @app.get("/api/portal-parceiros")
    async def portal_parceiros_list(search: str = "", status: str = "todos", limit: int = Query(default=200, ge=1, le=1000)):
        items = await _all(db.portal_parceiros, "createdAt", limit)
        if status and status != "todos":
            items = [item for item in items if str(item.get("status", "")).lower() == status.lower()]
        term = str(search or "").strip().lower()
        if term:
            term_digits = _digits(term)
            items = [
                item for item in items
                if term in " ".join(str(item.get(key) or "").lower() for key in ["nome", "empresa", "email", "telefone", "status"])
                or (term_digits and term_digits in _digits(item.get("documento")))
                or any(term in str(contract).lower() for contract in item.get("contratos", []))
            ]
        return [_public_partner(item) for item in items]

    @app.post("/api/portal-parceiros")
    async def portal_parceiros_create(payload: Dict[str, Any] = Body(...)):
        item = _normalize_partner_payload(payload, now_iso, now_br)
        existing = await db.portal_parceiros.find_one({"documento": item["documento"]}, projection)
        if existing:
            raise HTTPException(status_code=409, detail="Já existe um cadastro para este CPF/CNPJ.")
        await db.portal_parceiros.insert_one(item)
        return _public_partner(item)

    @app.put("/api/portal-parceiros/{partner_id}")
    async def portal_parceiros_update(partner_id: str, payload: Dict[str, Any] = Body(...)):
        existing = await db.portal_parceiros.find_one({"id": partner_id}, projection)
        if not existing:
            raise HTTPException(status_code=404, detail="Cadastro do portal não encontrado.")
        item = _normalize_partner_payload(payload, now_iso, now_br, existing)
        duplicate = await db.portal_parceiros.find_one({"documento": item["documento"], "id": {"$ne": partner_id}}, projection)
        if duplicate:
            raise HTTPException(status_code=409, detail="Outro cadastro já usa este CPF/CNPJ.")
        await db.portal_parceiros.replace_one({"id": partner_id}, item)
        return _public_partner(item)

    @app.delete("/api/portal-parceiros/{partner_id}")
    async def portal_parceiros_delete(partner_id: str):
        result = await db.portal_parceiros.delete_one({"id": partner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Cadastro do portal não encontrado.")
        return {"ok": True, "deleted": partner_id}

    @app.post("/api/portal-doncor/login")
    async def portal_doncor_login(payload: Dict[str, Any] = Body(...)):
        documento = payload.get("documento") or payload.get("cpfCnpj") or payload.get("cpf_cnpj")
        secret = str(payload.get("senha") or payload.get("password") or "")
        if not secret:
            raise HTTPException(status_code=400, detail="Informe a senha de acesso.")

        doc = _digits(documento)
        partner = await _registered_partner(db, doc)
        if not partner:
            raise HTTPException(status_code=404, detail="CPF/CNPJ sem acesso cadastrado. Entre em contato com a DonCor.")
        if not partner.get("accessDigest") or not partner.get("accessSalt"):
            raise HTTPException(status_code=403, detail="Senha ainda não cadastrada para este acesso. Entre em contato com a DonCor.")
        if not _check_access_secret(partner, secret):
            raise HTTPException(status_code=401, detail="CPF/CNPJ ou senha inválidos.")

        context = await _find_partner_context(db, documento)
        first_access = not bool(partner.get("primeiroAcessoEm"))
        await db.portal_parceiros.update_one(
            {"id": partner.get("id")},
            {"$set": {"ultimoAcessoEm": now_iso(), "primeiroAcessoEm": partner.get("primeiroAcessoEm") or now_iso(), "updatedAt": now_iso(), "atualizadoEm": now_br()}}
        )

        return {
            "token": str(uuid.uuid4()),
            "documento": context["documento"],
            "tipo": context["tipo"],
            "nome": context["nome"],
            "empresa": context["empresa"],
            "contratos": context["contratoNumeros"],
            "primeiroAcesso": first_access,
        }

    @app.post("/api/portal-doncor/alterar-senha")
    async def portal_doncor_alterar_senha(payload: Dict[str, Any] = Body(...)):
        documento = payload.get("documento") or payload.get("cpfCnpj") or payload.get("cpf_cnpj")
        current_secret = str(payload.get("senhaAtual") or payload.get("currentPassword") or "")
        new_secret = str(payload.get("novaSenha") or payload.get("newPassword") or "")
        if not current_secret or not new_secret:
            raise HTTPException(status_code=400, detail="Informe a senha atual e a nova senha.")
        if len(new_secret) < 6:
            raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres.")

        partner = await _registered_partner(db, documento)
        if not partner or not _check_access_secret(partner, current_secret):
            raise HTTPException(status_code=401, detail="Senha atual inválida.")

        updated = dict(partner)
        _set_access_secret(updated, new_secret, now_iso)
        await db.portal_parceiros.update_one(
            {"id": partner.get("id")},
            {"$set": {
                "accessSalt": updated["accessSalt"],
                "accessDigest": updated["accessDigest"],
                "senhaDefinida": True,
                "senhaAtualizadaEm": updated["senhaAtualizadaEm"],
                "updatedAt": now_iso(),
                "atualizadoEm": now_br(),
            }}
        )
        return {"ok": True, "message": "Senha alterada com sucesso."}

    @app.get("/api/portal-doncor/resumo")
    async def portal_doncor_resumo(documento: str = Query(...)):
        return await _portal_payload(db, documento)

    @app.get("/api/portal-doncor/solicitacoes")
    async def portal_doncor_solicitacoes(
        documento: str = Query(...),
        search: str = "",
        tipo: str = "todos",
        status: str = "todos",
        limit: int = Query(default=200, ge=1, le=1000),
    ):
        context = await _find_partner_context(db, documento)
        doc = _digits(documento)
        contrato_numeros = set(context.get("contratoNumeros") or [])
        empresa_norm = str(context.get("empresa") or "").strip().lower()

        items = await _all(db.portal_solicitacoes, "createdAt", limit)
        filtered = [
            item for item in items
            if _digits(item.get("documento")) == doc
            or (item.get("contrato") and item.get("contrato") in contrato_numeros)
            or (empresa_norm and str(item.get("empresa") or "").strip().lower() == empresa_norm)
        ]

        if tipo and tipo != "todos":
            tipo_norm = tipo.strip().lower()
            filtered = [item for item in filtered if str(item.get("tipo") or item.get("tipoLabel") or "").strip().lower() == tipo_norm]
        if status and status != "todos":
            status_norm = status.strip().lower()
            filtered = [item for item in filtered if str(item.get("status") or "").strip().lower() == status_norm]

        term = str(search or "").strip().lower()
        if term:
            term_digits = _digits(term)
            filtered = [
                item for item in filtered
                if term in " ".join(str(item.get(key) or "").lower() for key in ["protocolo", "tipoLabel", "beneficiario", "cpf", "contrato", "status", "detalhes"])
                or (term_digits and term_digits in _digits(item.get("cpf")))
            ]

        return sorted(filtered, key=lambda item: item.get("createdAt") or "", reverse=True)

    @app.post("/api/portal-doncor/movimentacoes")
    async def portal_doncor_movimentacao(payload: Dict[str, Any] = Body(...)):
        documento = _digits(payload.get("documento"))
        context = await _find_partner_context(db, documento)
        tipo = str(payload.get("tipo") or "").strip().lower()
        tipo_labels = {"inclusao": "Inclusão", "exclusao": "Exclusão", "alteracao": "Alteração"}
        if tipo not in tipo_labels:
            raise HTTPException(status_code=400, detail="Tipo de movimentação inválido.")

        contrato = str(payload.get("contrato") or "").strip()
        if not contrato:
            contrato = next((item for item in context.get("contratoNumeros") or [] if item), "")

        beneficiario = str(payload.get("beneficiario") or payload.get("nome") or "").strip()
        detalhes = str(payload.get("detalhes") or payload.get("descricao") or "").strip()
        if tipo in {"inclusao", "exclusao"} and not beneficiario:
            raise HTTPException(status_code=400, detail="Informe o nome do beneficiário.")
        if not detalhes:
            raise HTTPException(status_code=400, detail="Informe os detalhes da solicitação.")

        anexos = _attachment_list(payload.get("anexos") or payload.get("attachments"))
        seq = await db.portal_solicitacoes.count_documents({}) + 1
        item = {
            "id": str(uuid.uuid4()),
            "protocolo": _portal_protocol(seq),
            "tipo": tipo,
            "tipoLabel": tipo_labels[tipo],
            "documento": context["documento"],
            "empresa": context["empresa"],
            "contrato": contrato,
            "operadora": str(payload.get("operadora") or "").strip(),
            "planos": payload.get("planos") or [],
            "tipoMovimentacao": payload.get("tipoMovimentacao") or "",
            "beneficiario": beneficiario,
            "cpf": _digits(payload.get("cpf")),
            "detalhes": detalhes,
            "anexos": anexos,
            "status": "Enviado",
            "dataEnvio": now_br(),
            "dataConclusao": "",
            "origem": "portal_cliente",
            "createdAt": now_iso(),
            "criadoEm": now_br(),
            "payload": payload,
        }

        await db.portal_solicitacoes.insert_one(item)
        await _insert_operational_request(db, tipo, item, payload)

        chat_item = {
            "id": str(uuid.uuid4()),
            "documento": context["documento"],
            "empresa": context["empresa"],
            "company": context["empresa"],
            "text": _request_text(item),
            "attachmentName": ", ".join(attachment["name"] for attachment in anexos),
            "attachmentSize": sum(int(attachment.get("size") or 0) for attachment in anexos),
            "attachments": anexos,
            "sender": context["empresa"],
            "senderRole": "portal",
            "direction": "incoming",
            "read": False,
            "protocolo": item["protocolo"],
            "createdAt": now_iso(),
            "criadoEm": now_br(),
        }
        await db.portal_chat.insert_one(chat_item)

        return item

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
        attachments = _attachment_list(payload.get("attachments") or payload.get("anexos"))
        if not attachment_name and attachments:
            attachment_name = ", ".join(attachment["name"] for attachment in attachments)
        if not text and not attachment_name and not attachments:
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
            "attachments": attachments,
            "sender": payload.get("sender") or empresa,
            "senderRole": sender_role,
            "direction": direction,
            "read": direction == "outgoing",
            "createdAt": now_iso(),
            "criadoEm": now_br(),
        }
        await db.portal_chat.insert_one(item)
        return item

    @app.patch("/api/portal-doncor/chat/read")
    async def portal_doncor_chat_read(payload: Dict[str, Any] = Body(...)):
        documento = _digits(payload.get("documento"))
        empresa_norm = str(payload.get("empresa") or payload.get("company") or "").strip().lower()
        items = await _all(db.portal_chat, "createdAt", 1000)
        matched = 0
        for item in items:
            same_doc = documento and _digits(item.get("documento")) == documento
            same_company = empresa_norm and str(item.get("empresa") or item.get("company") or "").strip().lower() == empresa_norm
            if same_doc or same_company:
                await db.portal_chat.update_one({"id": item.get("id")}, {"$set": {"read": True}})
                matched += 1
        return {"ok": True, "updated": matched}
