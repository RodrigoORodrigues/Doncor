"""Seed script to populate MongoDB with initial data."""
import logging

logger = logging.getLogger(__name__)

CONTRATOS_ADESAO = []

CONTRATOS_EMPRESARIAL = []

INCLUSOES = []

EXCLUSOES = []

TRANSFERENCIAS = []

FATURAS = []

COMISSOES = []

TAREFAS_PENDENTES = []

MOVIMENTACOES_RECENTES = []

SEGURADORAS = []

PRODUTOS = []

COLABORADORES = []


async def seed_database(db):
    """Seed the database with initial data if collections are empty."""
    collections_data = {
        "contratos_adesao": CONTRATOS_ADESAO,
        "contratos_empresarial": CONTRATOS_EMPRESARIAL,
        "inclusoes": INCLUSOES,
        "exclusoes": EXCLUSOES,
        "transferencias": TRANSFERENCIAS,
        "faturas": FATURAS,
        "comissoes": COMISSOES,
        "tarefas_pendentes": TAREFAS_PENDENTES,
        "movimentacoes_recentes": MOVIMENTACOES_RECENTES,
        "seguradoras": SEGURADORAS,
        "produtos": PRODUTOS,
        "colaboradores": COLABORADORES,
    }

    for collection_name, data in collections_data.items():
        collection = getattr(db, collection_name)
        await collection.drop()
        
        if data:
            await collection.insert_many(data)
            logger.info(f"Seeded {collection_name} with {len(data)} documents")
        else:
            logger.info(f"Collection {collection_name} is empty, skipped")
