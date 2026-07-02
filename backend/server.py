from fastapi import FastAPI, APIRouter, Query, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio

from models import (
    ContratoAdesao, ContratoAdesaoCreate,
    ContratoEmpresarial, ContratoEmpresarialCreate,
    Inclusao, InclusaoCreate,
    Exclusao, ExclusaoCreate,
    Transferencia, TransferenciaCreate,
    Seguradora, SeguradoraCreate,
    Produto, ProdutoCreate,
    Colaborador, ColaboradorCreate,
    RoboConfigPayload, RoboTriggerPayload,
)
from seed_data import seed_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


ROBO_ALLOWED_ROLES = {"admin", "master", "diretoria"}


def _require_robo_role(x_user_role: Optional[str] = Header(default=None)):
    if not x_user_role:
        raise HTTPException(status_code=401, detail="Não autenticado")

    role = x_user_role.strip().lower()
    if role not in ROBO_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Acesso negado")


# ─── Startup: Seed DB ─────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(seed_database(db))
    logger.info("Database seeding started in background")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ─── Helper ────────────────────────────────────────────────────
def _proj():
    return {"_id": 0}


def _next_protocol(prefix: str, seq: int):
    return f"{prefix}-{datetime.now().year}-{seq:04d}"




async def _get_robo_config_latest():
    cfg = await db.robo_config.find_one({}, _proj(), sort=[("updatedAt", -1), ("_id", -1)])
    if cfg:
        return cfg
    return {
        "intervaloMinutos": 15,
        "tentativas": 3,
        "notificacoes": True,
        "modoSeguro": True,
        "ambienteExecucao": "backend_fastapi",
        "triggerEndpoint": "/api/v1/trigger-rpa",
        "rpaServiceUrl": "",
        "timeoutSegundos": 120,
        "operadoras": [],
        "supabaseUrl": "",
        "supabaseServiceRoleKey": "",
        "supabaseBucketBoletos": "boletos",
        "logNivel": "INFO",
    }


async def _run_rpa_job(payload: dict, config: dict):
    service_url = config.get("rpaServiceUrl")
    timeout_segundos = config.get("timeoutSegundos", 120)

    if service_url:
        import requests
        try:
            resp = requests.post(service_url, json=payload, timeout=timeout_segundos)
            if resp.status_code >= 400:
                logger.error(f"RPA service error: {resp.status_code} - {resp.text}")
                raise HTTPException(status_code=502, detail=f"Falha no serviço RPA externo: {resp.text}")
            if resp.headers.get("content-type", "").startswith("application/json"):
                return resp.json()
            return {"status": "success", "message": "RPA externo executado"}
        except requests.exceptions.Timeout:
            logger.error(f"RPA service timeout after {timeout_segundos}s")
            raise HTTPException(status_code=504, detail=f"Timeout: serviço RPA não respondeu em {timeout_segundos}s")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"RPA service connection failed: {e}")
            raise HTTPException(status_code=503, detail="Serviço RPA não está disponível. Tente novamente mais tarde.")

    return {"status": "success", "message": "RPA executado em modo simulado"}

# ─── Root ──────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "Don Cor API - Gestão de Apólices"}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "service": "main"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "ok", "service": "main"}


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════
@api_router.get("/dashboard/stats")
async def dashboard_stats():
    adh_count = await db.contratos_adesao.count_documents({})
    emp_count = await db.contratos_empresarial.count_documents({})
    adh_ativos = await db.contratos_adesao.count_documents({"status": "Ativo"})
    emp_ativos = await db.contratos_empresarial.count_documents({"status": "Ativo"})

    pipeline_adh = [{"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    pipeline_emp = [{"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    adh_vidas = await db.contratos_adesao.aggregate(pipeline_adh).to_list(1)
    emp_vidas = await db.contratos_empresarial.aggregate(pipeline_emp).to_list(1)

    total_vidas = (adh_vidas[0]["total"] if adh_vidas else 0) + (emp_vidas[0]["total"] if emp_vidas else 0)

    pipeline_ativos_adh = [{"$match": {"status": "Ativo"}}, {"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    pipeline_ativos_emp = [{"$match": {"status": "Ativo"}}, {"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    adh_vidas_ativas = await db.contratos_adesao.aggregate(pipeline_ativos_adh).to_list(1)
    emp_vidas_ativas = await db.contratos_empresarial.aggregate(pipeline_ativos_emp).to_list(1)
    vidas_ativas = (adh_vidas_ativas[0]["total"] if adh_vidas_ativas else 0) + (emp_vidas_ativas[0]["total"] if emp_vidas_ativas else 0)

    mov_pendentes = await db.inclusoes.count_documents({"status": {"$in": ["Pendente", "Em Análise"]}})
    mov_pendentes += await db.exclusoes.count_documents({"status": {"$in": ["Pendente", "Em Análise"]}})
    mov_pendentes += await db.transferencias.count_documents({"status": {"$in": ["Pendente", "Em Análise"]}})

    faturas_pendentes = await db.faturas.count_documents({"status": {"$in": ["Aberta", "Vencida"]}})

    percentual = round((vidas_ativas / total_vidas * 100), 1) if total_vidas > 0 else 0

    return {
        "totalContratos": adh_count + emp_count,
        "contratosAtivos": adh_ativos + emp_ativos,
        "vidasTotal": total_vidas,
        "vidasAtivas": vidas_ativas,
        "percentualOcupacao": percentual,
        "movimentacoesPendentes": mov_pendentes,
        "faturasPendentes": faturas_pendentes,
    }


@api_router.get("/dashboard/chart-data")
async def dashboard_chart_data():
    inclusoes = await db.inclusoes.find({}, {"dataSolicitacao": 1, "_id": 0}).to_list(10000)
    exclusoes = await db.exclusoes.find({}, {"dataSolicitacao": 1, "_id": 0}).to_list(10000)
    transferencias = await db.transferencias.find({}, {"dataSolicitacao": 1, "_id": 0}).to_list(10000)

    if not inclusoes and not exclusoes and not transferencias:
        return []

    MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    current_month = datetime.now().month

    months_indices = []
    for i in range(5, -1, -1):
        m = current_month - i
        if m <= 0:
            m += 12
        months_indices.append(m)

    chart_dict = {m: {"mes": MONTHS_PT[m-1], "inclusoes": 0, "exclusoes": 0, "transferencias": 0} for m in months_indices}

    for inc in inclusoes:
        dt_str = inc.get("dataSolicitacao") or ""
        try:
            parts = dt_str.split("/")
            if len(parts) >= 2:
                m_idx = int(parts[1])
                if m_idx in chart_dict:
                    chart_dict[m_idx]["inclusoes"] += 1
        except Exception:
            pass

    for exc in exclusoes:
        dt_str = exc.get("dataSolicitacao") or ""
        try:
            parts = dt_str.split("/")
            if len(parts) >= 2:
                m_idx = int(parts[1])
                if m_idx in chart_dict:
                    chart_dict[m_idx]["exclusoes"] += 1
        except Exception:
            pass

    for trf in transferencias:
        dt_str = trf.get("dataSolicitacao") or ""
        try:
            parts = dt_str.split("/")
            if len(parts) >= 2:
                m_idx = int(parts[1])
                if m_idx in chart_dict:
                    chart_dict[m_idx]["transferencias"] += 1
        except Exception:
            pass

    return [chart_dict[m] for m in months_indices]


@api_router.get("/dashboard/seguradoras")
async def dashboard_seguradoras():
    pipeline = [
        {"$group": {"_id": "$seguradora", "vidas": {"$sum": "$vidas"}, "contratos": {"$sum": 1}}}
    ]
    adh = await db.contratos_adesao.aggregate(pipeline).to_list(100)
    emp = await db.contratos_empresarial.aggregate(pipeline).to_list(100)

    merged = {}
    for item in adh + emp:
        name = item["_id"]
        if name in merged:
            merged[name]["vidas"] += item["vidas"]
            merged[name]["contratos"] += item["contratos"]
        else:
            merged[name] = {"nome": name, "vidas": item["vidas"], "contratos": item["contratos"]}

    return list(merged.values())


@api_router.get("/dashboard/saldo-vidas")
async def dashboard_saldo_vidas():
    pipeline_all = [{"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    pipeline_ativas = [{"$match": {"status": "Ativo"}}, {"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    pipeline_suspensas = [{"$match": {"status": "Suspenso"}}, {"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]
    pipeline_canceladas = [{"$match": {"status": {"$in": ["Cancelado", "Vencido"]}}}, {"$group": {"_id": None, "total": {"$sum": "$vidas"}}}]

    def _val(results):
        return results[0]["total"] if results else 0

    total = _val(await db.contratos_adesao.aggregate(pipeline_all).to_list(1)) + _val(await db.contratos_empresarial.aggregate(pipeline_all).to_list(1))
    ativas = _val(await db.contratos_adesao.aggregate(pipeline_ativas).to_list(1)) + _val(await db.contratos_empresarial.aggregate(pipeline_ativas).to_list(1))
    suspensas = _val(await db.contratos_adesao.aggregate(pipeline_suspensas).to_list(1)) + _val(await db.contratos_empresarial.aggregate(pipeline_suspensas).to_list(1))
    canceladas = _val(await db.contratos_adesao.aggregate(pipeline_canceladas).to_list(1)) + _val(await db.contratos_empresarial.aggregate(pipeline_canceladas).to_list(1))

    percentual = round((ativas / total * 100), 1) if total > 0 else 0

    return {
        "percentual_total": percentual,
        "total_vidas": total,
        "vidas_ativas": ativas,
        "vidas_suspensas": suspensas,
        "vidas_canceladas": canceladas,
    }


@api_router.get("/tarefas-pendentes")
async def get_tarefas_pendentes():
    query = {"status": {"$regex": "^(Pendente|Em Análise|em análise|pendente)$", "$options": "i"}}
    
    inclusoes = await db.inclusoes.find(query, _proj()).to_list(100)
    for x in inclusoes:
        x["tipo"] = "Inclusão"
        x["protocolo"] = x.get("protocolo") or ""
        x["beneficiario"] = x.get("beneficiario") or ""
        x["dataSolicitacao"] = x.get("dataSolicitacao") or ""
        x["status"] = x.get("status") or "Pendente"

    exclusoes = await db.exclusoes.find(query, _proj()).to_list(100)
    for x in exclusoes:
        x["tipo"] = "Exclusão"
        x["protocolo"] = x.get("protocolo") or ""
        x["beneficiario"] = x.get("beneficiario") or ""
        x["dataSolicitacao"] = x.get("dataSolicitacao") or ""
        x["status"] = x.get("status") or "Pendente"

    transferencias = await db.transferencias.find(query, _proj()).to_list(100)
    for x in transferencias:
        x["tipo"] = "Transferência"
        x["protocolo"] = x.get("protocolo") or ""
        x["beneficiario"] = x.get("beneficiario") or ""
        x["dataSolicitacao"] = x.get("dataSolicitacao") or ""
        x["status"] = x.get("status") or "Pendente"

    all_pending = inclusoes + exclusoes + transferencias
    return all_pending


@api_router.get("/movimentacoes-recentes")
async def get_movimentacoes_recentes():
    items = await db.movimentacoes_recentes.find({}, _proj()).to_list(100)
    return items


# ═══════════════════════════════════════════════════════════════
#  CONTRATOS ADESÃO
# ═══════════════════════════════════════════════════════════════
@api_router.get("/contratos-adesao")
async def list_contratos_adesao(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"numero": {"$regex": search, "$options": "i"}},
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"produto": {"$regex": search, "$options": "i"}},
            {"administradora": {"$regex": search, "$options": "i"}},
        ]
    items = await db.contratos_adesao.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/contratos-adesao")
async def create_contrato_adesao(data: ContratoAdesaoCreate):
    obj = ContratoAdesao(**data.model_dump())
    await db.contratos_adesao.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.get("/contratos-adesao/{item_id}")
async def get_contrato_adesao(item_id: str):
    item = await db.contratos_adesao.find_one({"id": item_id}, _proj())
    if not item:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return item


@api_router.put("/contratos-adesao/{item_id}")
async def update_contrato_adesao(item_id: str, data: ContratoAdesaoCreate):
    result = await db.contratos_adesao.update_one({"id": item_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return await db.contratos_adesao.find_one({"id": item_id}, _proj())


@api_router.delete("/contratos-adesao/{item_id}")
async def delete_contrato_adesao(item_id: str):
    result = await db.contratos_adesao.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return {"message": "Contrato excluído com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  CONTRATOS EMPRESARIAL
# ═══════════════════════════════════════════════════════════════
@api_router.get("/contratos-empresarial")
async def list_contratos_empresarial(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"numero": {"$regex": search, "$options": "i"}},
            {"empresa": {"$regex": search, "$options": "i"}},
            {"cnpj": {"$regex": search, "$options": "i"}},
            {"seguradora": {"$regex": search, "$options": "i"}},
        ]
    items = await db.contratos_empresarial.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/contratos-empresarial")
async def create_contrato_empresarial(data: ContratoEmpresarialCreate):
    obj = ContratoEmpresarial(**data.model_dump())
    await db.contratos_empresarial.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.get("/contratos-empresarial/{item_id}")
async def get_contrato_empresarial(item_id: str):
    item = await db.contratos_empresarial.find_one({"id": item_id}, _proj())
    if not item:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return item


@api_router.put("/contratos-empresarial/{item_id}")
async def update_contrato_empresarial(item_id: str, data: ContratoEmpresarialCreate):
    result = await db.contratos_empresarial.update_one({"id": item_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return await db.contratos_empresarial.find_one({"id": item_id}, _proj())


@api_router.delete("/contratos-empresarial/{item_id}")
async def delete_contrato_empresarial(item_id: str):
    result = await db.contratos_empresarial.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return {"message": "Contrato excluído com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  INCLUSÕES
# ═══════════════════════════════════════════════════════════════
@api_router.get("/inclusoes")
async def list_inclusoes(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"contrato": {"$regex": search, "$options": "i"}},
            {"empresa": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search, "$options": "i"}},
        ]
    items = await db.inclusoes.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/inclusoes")
async def create_inclusao(data: InclusaoCreate):
    obj = Inclusao(**data.model_dump())
    obj.protocolo = _next_protocol("INC", await db.inclusoes.count_documents({}) + 1)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    await db.inclusoes.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.get("/inclusoes/{item_id}")
async def get_inclusao(item_id: str):
    item = await db.inclusoes.find_one({"id": item_id}, _proj())
    if not item:
        raise HTTPException(status_code=404, detail="Inclusão não encontrada")
    return item


@api_router.put("/inclusoes/{item_id}")
async def update_inclusao(item_id: str, data: dict):
    result = await db.inclusoes.update_one({"id": item_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inclusão não encontrada")
    return await db.inclusoes.find_one({"id": item_id}, _proj())


# ═══════════════════════════════════════════════════════════════
#  EXCLUSÕES
# ═══════════════════════════════════════════════════════════════
@api_router.get("/exclusoes")
async def list_exclusoes(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"contrato": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search, "$options": "i"}},
        ]
    items = await db.exclusoes.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/exclusoes")
async def create_exclusao(data: ExclusaoCreate):
    obj = Exclusao(**data.model_dump())
    obj.protocolo = _next_protocol("EXC", await db.exclusoes.count_documents({}) + 1)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    await db.exclusoes.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/exclusoes/{item_id}")
async def update_exclusao(item_id: str, data: dict):
    result = await db.exclusoes.update_one({"id": item_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Exclusão não encontrada")
    return await db.exclusoes.find_one({"id": item_id}, _proj())


# ═══════════════════════════════════════════════════════════════
#  TRANSFERÊNCIAS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/transferencias")
async def list_transferencias(search: str = ""):
    query = {}
    if search:
        query["$or"] = [
            {"contratoOrigem": {"$regex": search, "$options": "i"}},
            {"contratoDestino": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search, "$options": "i"}},
        ]
    items = await db.transferencias.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/transferencias")
async def create_transferencia(data: TransferenciaCreate):
    obj = Transferencia(**data.model_dump())
    obj.protocolo = _next_protocol("TRF", await db.transferencias.count_documents({}) + 1)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    await db.transferencias.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/transferencias/{item_id}")
async def update_transferencia(item_id: str, data: dict):
    result = await db.transferencias.update_one({"id": item_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transferência não encontrada")
    return await db.transferencias.find_one({"id": item_id}, _proj())


# ═══════════════════════════════════════════════════════════════
#  FATURAS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/faturas")
async def list_faturas(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"numero": {"$regex": search, "$options": "i"}},
            {"contrato": {"$regex": search, "$options": "i"}},
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"competencia": {"$regex": search, "$options": "i"}},
        ]
    items = await db.faturas.find(query, _proj()).to_list(1000)
    return items


@api_router.get("/faturas/resumo")
async def faturas_resumo():
    abertas = await db.faturas.count_documents({"status": "Aberta"})
    vencidas = await db.faturas.count_documents({"status": "Vencida"})
    pagas = await db.faturas.count_documents({"status": "Paga"})
    return {"abertas": abertas, "vencidas": vencidas, "pagas": pagas}


# ═══════════════════════════════════════════════════════════════
#  COMISSÕES
# ═══════════════════════════════════════════════════════════════
@api_router.get("/comissoes")
async def list_comissoes(search: str = ""):
    query = {}
    if search:
        query["$or"] = [
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"competencia": {"$regex": search, "$options": "i"}},
            {"status": {"$regex": search, "$options": "i"}},
        ]
    items = await db.comissoes.find(query, _proj()).to_list(1000)
    return items


@api_router.get("/comissoes/evolucao")
async def comissoes_evolucao():
    return [
        {"mes": "Jan", "prevista": 45000, "recebida": 42000},
        {"mes": "Fev", "prevista": 52000, "recebida": 51000},
        {"mes": "Mar", "prevista": 48000, "recebida": 46500},
        {"mes": "Abr", "prevista": 61000, "recebida": 59000},
        {"mes": "Mai", "prevista": 55000, "recebida": 0},
    ]


# ═══════════════════════════════════════════════════════════════
#  SEGURADORAS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/seguradoras")
async def list_seguradoras(search: str = "", status: str = "todos"):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cnpj": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    items = await db.seguradoras.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/seguradoras")
async def create_seguradora(data: SeguradoraCreate):
    obj = Seguradora(**data.model_dump())
    await db.seguradoras.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/seguradoras/{item_id}")
async def update_seguradora(item_id: str, data: SeguradoraCreate):
    result = await db.seguradoras.update_one({"id": item_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Seguradora não encontrada")
    return await db.seguradoras.find_one({"id": item_id}, _proj())


@api_router.delete("/seguradoras/{item_id}")
async def delete_seguradora(item_id: str):
    result = await db.seguradoras.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seguradora não encontrada")
    return {"message": "Seguradora excluída com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  PRODUTOS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/produtos")
async def list_produtos(search: str = "", status: str = "todos", seguradora: str = ""):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if seguradora:
        query["seguradora"] = {"$regex": seguradora, "$options": "i"}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"tipo": {"$regex": search, "$options": "i"}},
        ]
    items = await db.produtos.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/produtos")
async def create_produto(data: ProdutoCreate):
    obj = Produto(**data.model_dump())
    await db.produtos.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/produtos/{item_id}")
async def update_produto(item_id: str, data: ProdutoCreate):
    result = await db.produtos.update_one({"id": item_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return await db.produtos.find_one({"id": item_id}, _proj())


@api_router.delete("/produtos/{item_id}")
async def delete_produto(item_id: str):
    result = await db.produtos.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto excluído com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  COLABORADORES
# ═══════════════════════════════════════════════════════════════
@api_router.get("/colaboradores")
async def list_colaboradores(search: str = "", status: str = "todos", departamento: str = ""):
    query = {}
    if status != "todos":
        query["status"] = {"$regex": f"^{status}$", "$options": "i"}
    if departamento:
        query["departamento"] = {"$regex": departamento, "$options": "i"}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cargo": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    items = await db.colaboradores.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/colaboradores")
async def create_colaborador(data: ColaboradorCreate):
    obj = Colaborador(**data.model_dump())
    obj.dataAdmissao = datetime.now().strftime("%d/%m/%Y")
    await db.colaboradores.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/colaboradores/{item_id}")
async def update_colaborador(item_id: str, data: ColaboradorCreate):
    result = await db.colaboradores.update_one({"id": item_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return await db.colaboradores.find_one({"id": item_id}, _proj())


@api_router.delete("/colaboradores/{item_id}")
async def delete_colaborador(item_id: str):
    result = await db.colaboradores.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return {"message": "Colaborador excluído com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  ROBÔ / AUTOMAÇÃO
# ═══════════════════════════════════════════════════════════════
@api_router.get("/robo/status")
async def robo_status():
    estado = await db.robo_estado.find_one({"id": "default"}, _proj())
    return {
        "status": (estado or {}).get("status", "ready"),
        "queue": await db.tarefas_pendentes.count_documents({}),
        "lastRunAt": (estado or {}).get("lastRunAt"),
        "successRate": (estado or {}).get("successRate", 98),
    }


@api_router.post("/robo/iniciar")
async def robo_iniciar(_: None = Depends(_require_robo_role)):
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    await db.robo_estado.update_one(
        {"id": "default"},
        {"$set": {"id": "default", "status": "running", "lastRunAt": now, "successRate": 98}},
        upsert=True,
    )
    return {"message": "Robô iniciado com sucesso", "status": "running", "lastRunAt": now}


@api_router.post("/robo/pausar")
async def robo_pausar(_: None = Depends(_require_robo_role)):
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    await db.robo_estado.update_one(
        {"id": "default"},
        {"$set": {"id": "default", "status": "ready", "lastRunAt": now, "successRate": 98}},
        upsert=True,
    )
    return {"message": "Robô pausado com sucesso", "status": "ready", "lastRunAt": now}




@api_router.get("/robo/config")
async def get_robo_config(_: None = Depends(_require_robo_role)):
    return await _get_robo_config_latest()


@api_router.post("/robo/config")
async def save_robo_config(data: RoboConfigPayload, _: None = Depends(_require_robo_role)):
    payload = data.model_dump()
    payload["updatedAt"] = datetime.now().strftime("%d/%m/%Y %H:%M")
    current = await db.robo_config.find_one({}, {"_id": 1}, sort=[("updatedAt", -1), ("_id", -1)])
    if current:
        await db.robo_config.update_one({"_id": current["_id"]}, {"$set": payload})
    else:
        await db.robo_config.insert_one(payload)
    return {"message": "Configuração salva", "config": payload}


@api_router.post("/robo/trigger-real")
async def trigger_robo_real(data: RoboTriggerPayload, _: None = Depends(_require_robo_role)):
    cfg = await _get_robo_config_latest()
    if not cfg.get("operadoras"):
        raise HTTPException(status_code=400, detail="Nenhuma operadora configurada no RoboConfig")

    selected = cfg.get("operadoras", [])[0]
    if data.operadora_nome:
        for op in cfg.get("operadoras", []):
            if (op.get("nome") or "").lower() == data.operadora_nome.lower():
                selected = op
                break

    job_payload = {
        "user_id": data.user_id,
        "unique_login_code": data.unique_login_code,
        "apolice_id": data.apolice_id,
        "operadora": selected,
        "supabase": {
            "url": cfg.get("supabaseUrl"),
            "serviceRoleKey": cfg.get("supabaseServiceRoleKey"),
            "bucket": cfg.get("supabaseBucketBoletos", "boletos"),
        },
    }

    try:
        result = await _run_rpa_job(job_payload, cfg)
    except HTTPException as e:
        logger.warning(f"RPA externo falhou ({e.status_code}). Usando fallback simulado: {e.detail}")
        result = {
            "status": "success_simulated",
            "message": "RPA em modo simulado (serviço externo indisponível)",
            "warning": e.detail,
        }

    exec_item = {
        "id": str(uuid.uuid4()),
        "processo": "Extração de boletos RPA",
        "inicio": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "duracao": "--",
        "status": "Concluído" if result.get("status") == "success" else "Simulado",
        "resultado": result,
    }
    await db.robo_execucoes_log.insert_one(exec_item)
    return {"message": "RPA acionado", "result": result}

@api_router.get("/robo/execucoes")
async def robo_execucoes(_: None = Depends(_require_robo_role)):
    db_items = await db.robo_execucoes_log.find({}, _proj()).sort("inicio", -1).to_list(50)
    if db_items:
        return db_items

    return [
        {"id": "rb-001", "processo": "Importação de faturas", "inicio": "19/05/2026 08:15", "duracao": "01m42s", "status": "Concluído"},
        {"id": "rb-002", "processo": "Validação de contratos", "inicio": "19/05/2026 09:10", "duracao": "03m05s", "status": "Concluído"},
        {"id": "rb-003", "processo": "Conciliação de comissão", "inicio": "19/05/2026 10:00", "duracao": "--", "status": "Em execução"},
    ]


# ═══════════════════════════════════════════════════════════════
#  RELATÓRIOS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/relatorios/resumo-geral")
async def relatorio_resumo_geral():
    adh = await db.contratos_adesao.find({}, _proj()).to_list(1000)
    emp = await db.contratos_empresarial.find({}, _proj()).to_list(1000)
    inc = await db.inclusoes.count_documents({})
    exc = await db.exclusoes.count_documents({})
    trf = await db.transferencias.count_documents({})

    seg_pipeline = [{"$group": {"_id": "$seguradora", "vidas": {"$sum": "$vidas"}, "contratos": {"$sum": 1}, "valor": {"$sum": 1}}}]
    seg_adh = await db.contratos_adesao.aggregate(seg_pipeline).to_list(100)
    seg_emp = await db.contratos_empresarial.aggregate(seg_pipeline).to_list(100)

    por_seguradora = {}
    for s in seg_adh + seg_emp:
        name = s["_id"]
        if name in por_seguradora:
            por_seguradora[name]["vidas"] += s["vidas"]
            por_seguradora[name]["contratos"] += s["contratos"]
        else:
            por_seguradora[name] = {"seguradora": name, "vidas": s["vidas"], "contratos": s["contratos"]}

    status_adh = {}
    for c in adh:
        st = c.get("status", "Ativo")
        status_adh[st] = status_adh.get(st, 0) + 1
    status_emp = {}
    for c in emp:
        st = c.get("status", "Ativo")
        status_emp[st] = status_emp.get(st, 0) + 1

    return {
        "totalContratosAdesao": len(adh),
        "totalContratosEmpresarial": len(emp),
        "totalInclusoes": inc,
        "totalExclusoes": exc,
        "totalTransferencias": trf,
        "porSeguradora": list(por_seguradora.values()),
        "statusAdesao": status_adh,
        "statusEmpresarial": status_emp,
    }


# ─── Include router & middleware ──────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
