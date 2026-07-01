"""Seed script to populate MongoDB with initial data."""
import logging

logger = logging.getLogger(__name__)

CONTRATOS_ADESAO = []

CONTRATOS_EMPRESARIAL = []

INCLUSOES = [
    {"id": "inc-1", "protocolo": "INC-2026-0341", "contrato": "EMP-2024-001", "empresa": "Tech Solutions Ltda", "beneficiario": "Ana Paula Santos", "cpf": "123.456.789-00", "parentesco": "Titular", "dataSolicitacao": "05/03/2026", "status": "Aprovado"},
    {"id": "inc-2", "protocolo": "INC-2026-0340", "contrato": "ADH-2024-003", "empresa": "-", "beneficiario": "João Pedro Alves", "cpf": "987.654.321-00", "parentesco": "Dependente", "dataSolicitacao": "04/03/2026", "status": "Em Análise"},
    {"id": "inc-3", "protocolo": "INC-2026-0339", "contrato": "EMP-2024-003", "empresa": "Indústria ABC ME", "beneficiario": "Fernanda Costa", "cpf": "456.789.123-00", "parentesco": "Titular", "dataSolicitacao": "02/03/2026", "status": "Aprovado"},
    {"id": "inc-4", "protocolo": "INC-2026-0338", "contrato": "EMP-2024-002", "empresa": "Global Commerce SA", "beneficiario": "Lucas Mendes", "cpf": "321.654.987-00", "parentesco": "Dependente", "dataSolicitacao": "01/03/2026", "status": "Pendente"},
    {"id": "inc-5", "protocolo": "INC-2026-0337", "contrato": "ADH-2024-001", "empresa": "-", "beneficiario": "Mariana Souza", "cpf": "654.987.321-00", "parentesco": "Titular", "dataSolicitacao": "28/02/2026", "status": "Aprovado"},
    {"id": "inc-6", "protocolo": "INC-2026-0336", "contrato": "EMP-2024-005", "empresa": "Logística Express", "beneficiario": "Pedro Henrique Lima", "cpf": "789.123.456-00", "parentesco": "Titular", "dataSolicitacao": "27/02/2026", "status": "Recusado"},
]

EXCLUSOES = [
    {"id": "exc-1", "protocolo": "EXC-2026-0102", "contrato": "ADH-2024-003", "beneficiario": "Roberto Oliveira", "cpf": "111.222.333-44", "motivo": "Solicitação do titular", "dataSolicitacao": "04/03/2026", "status": "Pendente"},
    {"id": "exc-2", "protocolo": "EXC-2026-0101", "contrato": "EMP-2024-001", "beneficiario": "Sandra Ferreira", "cpf": "555.666.777-88", "motivo": "Desligamento", "dataSolicitacao": "03/03/2026", "status": "Aprovado"},
    {"id": "exc-3", "protocolo": "EXC-2026-0100", "contrato": "EMP-2024-003", "beneficiario": "Ricardo Gomes", "cpf": "999.888.777-66", "motivo": "Desligamento", "dataSolicitacao": "01/03/2026", "status": "Aprovado"},
    {"id": "exc-4", "protocolo": "EXC-2026-0099", "contrato": "ADH-2024-002", "beneficiario": "Cláudia Rocha", "cpf": "222.333.444-55", "motivo": "Portabilidade", "dataSolicitacao": "28/02/2026", "status": "Em Análise"},
    {"id": "exc-5", "protocolo": "EXC-2026-0098", "contrato": "EMP-2024-005", "beneficiario": "Marcos Tavares", "cpf": "444.555.666-77", "motivo": "Solicitação do titular", "dataSolicitacao": "26/02/2026", "status": "Aprovado"},
]

TRANSFERENCIAS = [
    {"id": "trf-1", "protocolo": "TRF-2026-0045", "contratoOrigem": "EMP-2024-002", "contratoDestino": "EMP-2024-001", "beneficiario": "Maria Clara Lima", "cpf": "333.444.555-66", "dataSolicitacao": "03/03/2026", "status": "Aprovado"},
    {"id": "trf-2", "protocolo": "TRF-2026-0044", "contratoOrigem": "ADH-2024-001", "contratoDestino": "ADH-2024-003", "beneficiario": "Paulo Roberto Silva", "cpf": "777.888.999-00", "dataSolicitacao": "01/03/2026", "status": "Pendente"},
    {"id": "trf-3", "protocolo": "TRF-2026-0043", "contratoOrigem": "EMP-2024-003", "contratoDestino": "EMP-2024-005", "beneficiario": "Juliana Martins", "cpf": "111.999.888-77", "dataSolicitacao": "27/02/2026", "status": "Aprovado"},
    {"id": "trf-4", "protocolo": "TRF-2026-0042", "contratoOrigem": "ADH-2024-002", "contratoDestino": "ADH-2024-001", "beneficiario": "Carlos Magno Costa", "cpf": "555.444.333-22", "dataSolicitacao": "25/02/2026", "status": "Em Análise"},
]

FATURAS = []

COMISSOES = []

TAREFAS_PENDENTES = []

MOVIMENTACOES_RECENTES = []

SEGURADORAS = []

PRODUTOS = []

COLABORADORES = [
    {"id": "col-1", "nome": "Donfim", "cargo": "Master", "email": "donfim@doncor.local", "telefone": "(11) 99999-0000", "departamento": "Diretoria", "status": "Ativo", "dataAdmissao": "01/01/2026"},
]


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
