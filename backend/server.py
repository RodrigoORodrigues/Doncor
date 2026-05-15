from fastapi import FastAPI, APIRouter, Query, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models import (
    ContratoAdesao, ContratoAdesaoCreate,
    ContratoEmpresarial, ContratoEmpresarialCreate,
    Inclusao, InclusaoCreate,
    Exclusao, ExclusaoCreate,
    Transferencia, TransferenciaCreate,
    Seguradora, SeguradoraCreate,
    Produto, ProdutoCreate,
    Colaborador, ColaboradorCreate,
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


# ─── Startup: Seed DB ─────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    await seed_database(db)
    logger.info("Database seeded successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ─── Helper ────────────────────────────────────────────────────
def _proj():
    return {"_id": 0}


def _next_protocol(prefix: str, seq: int):
    return f"{prefix}-{datetime.now().year}-{seq:04d}"


# ─── Root ──────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "Don Cor API - Gestão de Apólices"}


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
    return [
        {"mes": "Jan", "inclusoes": 45, "exclusoes": 12, "transferencias": 8},
        {"mes": "Fev", "inclusoes": 52, "exclusoes": 18, "transferencias": 5},
        {"mes": "Mar", "inclusoes": 38, "exclusoes": 15, "transferencias": 12},
        {"mes": "Abr", "inclusoes": 67, "exclusoes": 22, "transferencias": 9},
        {"mes": "Mai", "inclusoes": 55, "exclusoes": 14, "transferencias": 7},
        {"mes": "Jun", "inclusoes": 71, "exclusoes": 19, "transferencias": 11},
    ]


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
    items = await db.tarefas_pendentes.find({}, _proj()).to_list(100)
    return items


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
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"cnpj": {"$regex": search, "$options": "i"}},
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
            {"protocolo": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
            {"contrato": {"$regex": search, "$options": "i"}},
        ]
    items = await db.inclusoes.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/inclusoes")
async def create_inclusao(data: InclusaoCreate):
    count = await db.inclusoes.count_documents({})
    obj = Inclusao(**data.model_dump())
    obj.protocolo = _next_protocol("INC", 342 + count)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    obj.status = "Pendente"
    await db.inclusoes.insert_one(obj.model_dump())
    # Also add to movimentacoes_recentes
    await db.movimentacoes_recentes.insert_one({
        "id": str(uuid.uuid4()), "tipo": "Inclusão", "contrato": data.contrato,
        "beneficiario": data.beneficiario, "data": obj.dataSolicitacao, "status": "Pendente"
    })
    return obj.model_dump()


@api_router.get("/inclusoes/{item_id}")
async def get_inclusao(item_id: str):
    item = await db.inclusoes.find_one({"id": item_id}, _proj())
    if not item:
        raise HTTPException(status_code=404, detail="Inclusão não encontrada")
    return item


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
            {"protocolo": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
        ]
    items = await db.exclusoes.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/exclusoes")
async def create_exclusao(data: ExclusaoCreate):
    count = await db.exclusoes.count_documents({})
    obj = Exclusao(**data.model_dump())
    obj.protocolo = _next_protocol("EXC", 103 + count)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    obj.status = "Pendente"
    await db.exclusoes.insert_one(obj.model_dump())
    await db.movimentacoes_recentes.insert_one({
        "id": str(uuid.uuid4()), "tipo": "Exclusão", "contrato": data.contrato,
        "beneficiario": data.beneficiario, "data": obj.dataSolicitacao, "status": "Pendente"
    })
    return obj.model_dump()


# ═══════════════════════════════════════════════════════════════
#  TRANSFERÊNCIAS
# ═══════════════════════════════════════════════════════════════
@api_router.get("/transferencias")
async def list_transferencias(search: str = ""):
    query = {}
    if search:
        query["$or"] = [
            {"protocolo": {"$regex": search, "$options": "i"}},
            {"beneficiario": {"$regex": search, "$options": "i"}},
        ]
    items = await db.transferencias.find(query, _proj()).to_list(1000)
    return items


@api_router.post("/transferencias")
async def create_transferencia(data: TransferenciaCreate):
    count = await db.transferencias.count_documents({})
    obj = Transferencia(**data.model_dump())
    obj.protocolo = _next_protocol("TRF", 46 + count)
    obj.dataSolicitacao = datetime.now().strftime("%d/%m/%Y")
    obj.status = "Pendente"
    await db.transferencias.insert_one(obj.model_dump())
    await db.movimentacoes_recentes.insert_one({
        "id": str(uuid.uuid4()), "tipo": "Transferência", "contrato": data.contratoOrigem,
        "beneficiario": data.beneficiario, "data": obj.dataSolicitacao, "status": "Pendente"
    })
    return obj.model_dump()


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
            {"seguradora": {"$regex": search, "$options": "i"}},
            {"contrato": {"$regex": search, "$options": "i"}},
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
        query["seguradora"] = {"$regex": search, "$options": "i"}
    items = await db.comissoes.find(query, _proj()).to_list(1000)
    return items


@api_router.get("/comissoes/evolucao")
async def comissoes_evolucao():
    return [
        {"mes": "Out", "valor": 18500},
        {"mes": "Nov", "valor": 19200},
        {"mes": "Dez", "valor": 21400},
        {"mes": "Jan", "valor": 20800},
        {"mes": "Fev", "valor": 22300},
        {"mes": "Mar", "valor": 9006},
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
            {"codigo": {"$regex": search, "$options": "i"}},
            {"cnpj": {"$regex": search, "$options": "i"}},
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
