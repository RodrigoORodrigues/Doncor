"""Seed script to populate MongoDB with initial data."""
import logging

logger = logging.getLogger(__name__)

CONTRATOS_ADESAO = [
    {"id": "adh-1", "numero": "ADH-2024-001", "seguradora": "Amil", "produto": "Amil 400 QC Nacional", "administradora": "Qualicorp", "vigencia": "01/01/2024", "vidas": 156, "status": "Ativo", "valorMensal": "R$ 45.200,00"},
    {"id": "adh-2", "numero": "ADH-2024-002", "seguradora": "Bradesco Saúde", "produto": "Top Nacional Plus", "administradora": "Qualicorp", "vigencia": "01/03/2024", "vidas": 89, "status": "Ativo", "valorMensal": "R$ 32.150,00"},
    {"id": "adh-3", "numero": "ADH-2024-003", "seguradora": "SulAmérica", "produto": "Prestige", "administradora": "Aliança", "vigencia": "01/06/2024", "vidas": 234, "status": "Ativo", "valorMensal": "R$ 78.900,00"},
    {"id": "adh-4", "numero": "ADH-2023-015", "seguradora": "Unimed", "produto": "Unimax", "administradora": "Qualicorp", "vigencia": "01/08/2023", "vidas": 67, "status": "Ativo", "valorMensal": "R$ 18.450,00"},
    {"id": "adh-5", "numero": "ADH-2023-008", "seguradora": "NotreDame", "produto": "ND Sênior", "administradora": "Aliança", "vigencia": "01/04/2023", "vidas": 45, "status": "Cancelado", "valorMensal": "R$ 12.300,00"},
    {"id": "adh-6", "numero": "ADH-2024-007", "seguradora": "Amil", "produto": "Amil 500 QC", "administradora": "Qualicorp", "vigencia": "01/02/2024", "vidas": 112, "status": "Ativo", "valorMensal": "R$ 38.700,00"},
    {"id": "adh-7", "numero": "ADH-2024-010", "seguradora": "Bradesco Saúde", "produto": "Nacional Flex", "administradora": "Qualicorp", "vigencia": "01/05/2024", "vidas": 78, "status": "Ativo", "valorMensal": "R$ 24.800,00"},
    {"id": "adh-8", "numero": "ADH-2023-020", "seguradora": "Porto Seguro", "produto": "Bronze Plus", "administradora": "Aliança", "vigencia": "01/11/2023", "vidas": 34, "status": "Suspenso", "valorMensal": "R$ 9.200,00"},
]

CONTRATOS_EMPRESARIAL = [
    {"id": "emp-1", "numero": "EMP-2024-001", "empresa": "Tech Solutions Ltda", "cnpj": "12.345.678/0001-90", "seguradora": "Amil", "produto": "Amil S450", "vigencia": "01/01/2024", "vencimento": "01/01/2025", "vidas": 45, "status": "Ativo", "valorMensal": "R$ 22.500,00"},
    {"id": "emp-2", "numero": "EMP-2024-002", "empresa": "Global Commerce SA", "cnpj": "98.765.432/0001-10", "seguradora": "Bradesco Saúde", "produto": "Flex PME", "vigencia": "01/02/2024", "vencimento": "01/02/2025", "vidas": 120, "status": "Ativo", "valorMensal": "R$ 54.000,00"},
    {"id": "emp-3", "numero": "EMP-2024-003", "empresa": "Indústria ABC ME", "cnpj": "11.222.333/0001-44", "seguradora": "SulAmérica", "produto": "Executivo Plus", "vigencia": "01/04/2024", "vencimento": "01/04/2025", "vidas": 230, "status": "Ativo", "valorMensal": "R$ 115.000,00"},
    {"id": "emp-4", "numero": "EMP-2023-010", "empresa": "Consultoria Delta", "cnpj": "55.666.777/0001-88", "seguradora": "Unimed", "produto": "Uniflex", "vigencia": "01/07/2023", "vencimento": "01/07/2024", "vidas": 18, "status": "Vencido", "valorMensal": "R$ 7.200,00"},
    {"id": "emp-5", "numero": "EMP-2024-005", "empresa": "Logística Express", "cnpj": "22.333.444/0001-55", "seguradora": "NotreDame", "produto": "ND Empresarial", "vigencia": "01/03/2024", "vencimento": "01/03/2025", "vidas": 85, "status": "Ativo", "valorMensal": "R$ 38.250,00"},
    {"id": "emp-6", "numero": "EMP-2024-008", "empresa": "Varejo Master Ltda", "cnpj": "33.444.555/0001-66", "seguradora": "Porto Seguro", "produto": "Bronze Empresarial", "vigencia": "01/06/2024", "vencimento": "01/06/2025", "vidas": 62, "status": "Ativo", "valorMensal": "R$ 24.800,00"},
    {"id": "emp-7", "numero": "EMP-2023-015", "empresa": "Educação Viva SA", "cnpj": "44.555.666/0001-77", "seguradora": "Amil", "produto": "Amil S750", "vigencia": "01/09/2023", "vencimento": "01/09/2024", "vidas": 310, "status": "Ativo", "valorMensal": "R$ 186.000,00"},
    {"id": "emp-8", "numero": "EMP-2024-012", "empresa": "Farmácia Saúde ME", "cnpj": "66.777.888/0001-99", "seguradora": "Bradesco Saúde", "produto": "PME Compacto", "vigencia": "01/05/2024", "vencimento": "01/05/2025", "vidas": 8, "status": "Ativo", "valorMensal": "R$ 3.200,00"},
]

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

FATURAS = [
    {"id": "fat-1", "numero": "FAT-2026-0312", "contrato": "EMP-2024-001", "seguradora": "Amil", "competencia": "Mar/2026", "vencimento": "10/03/2026", "valor": "R$ 22.500,00", "valorPago": "-", "status": "Aberta"},
    {"id": "fat-2", "numero": "FAT-2026-0298", "contrato": "EMP-2024-002", "seguradora": "Bradesco Saúde", "competencia": "Mar/2026", "vencimento": "15/03/2026", "valor": "R$ 54.000,00", "valorPago": "-", "status": "Aberta"},
    {"id": "fat-3", "numero": "FAT-2026-0285", "contrato": "ADH-2024-003", "seguradora": "SulAmérica", "competencia": "Fev/2026", "vencimento": "10/02/2026", "valor": "R$ 78.900,00", "valorPago": "R$ 78.900,00", "status": "Paga"},
    {"id": "fat-4", "numero": "FAT-2026-0270", "contrato": "EMP-2024-003", "seguradora": "SulAmérica", "competencia": "Fev/2026", "vencimento": "15/02/2026", "valor": "R$ 115.000,00", "valorPago": "R$ 115.000,00", "status": "Paga"},
    {"id": "fat-5", "numero": "FAT-2026-0256", "contrato": "ADH-2024-001", "seguradora": "Amil", "competencia": "Fev/2026", "vencimento": "10/02/2026", "valor": "R$ 45.200,00", "valorPago": "-", "status": "Vencida"},
    {"id": "fat-6", "numero": "FAT-2026-0241", "contrato": "EMP-2024-005", "seguradora": "NotreDame", "competencia": "Jan/2026", "vencimento": "10/01/2026", "valor": "R$ 38.250,00", "valorPago": "R$ 38.250,00", "status": "Paga"},
    {"id": "fat-7", "numero": "FAT-2026-0230", "contrato": "EMP-2024-008", "seguradora": "Porto Seguro", "competencia": "Jan/2026", "vencimento": "15/01/2026", "valor": "R$ 24.800,00", "valorPago": "R$ 24.800,00", "status": "Paga"},
]

COMISSOES = [
    {"id": "com-1", "seguradora": "Amil", "competencia": "Mar/2026", "contratos": 3, "vidasBase": 313, "percentual": "4.5%", "valorEstimado": "R$ 4.788,00", "status": "Prevista"},
    {"id": "com-2", "seguradora": "Bradesco Saúde", "competencia": "Mar/2026", "contratos": 3, "vidasBase": 287, "percentual": "3.8%", "valorEstimado": "R$ 4.218,90", "status": "Prevista"},
    {"id": "com-3", "seguradora": "SulAmérica", "competencia": "Fev/2026", "contratos": 2, "vidasBase": 464, "percentual": "5.0%", "valorEstimado": "R$ 9.695,00", "status": "Paga"},
    {"id": "com-4", "seguradora": "Unimed", "competencia": "Fev/2026", "contratos": 2, "vidasBase": 85, "percentual": "4.0%", "valorEstimado": "R$ 1.026,00", "status": "Paga"},
    {"id": "com-5", "seguradora": "NotreDame", "competencia": "Fev/2026", "contratos": 2, "vidasBase": 130, "percentual": "4.2%", "valorEstimado": "R$ 2.123,10", "status": "Paga"},
    {"id": "com-6", "seguradora": "Porto Seguro", "competencia": "Jan/2026", "contratos": 2, "vidasBase": 96, "percentual": "3.5%", "valorEstimado": "R$ 1.190,00", "status": "Paga"},
]

TAREFAS_PENDENTES = [
    {"id": "tar-1", "tipo": "Inclusão", "descricao": "Incluir 5 vidas - Contrato #1234", "prazo": "07/03/2026", "status": "Pendente", "prioridade": "Alta"},
    {"id": "tar-2", "tipo": "Exclusão", "descricao": "Excluir titular - Contrato #0987", "prazo": "08/03/2026", "status": "Em Análise", "prioridade": "Média"},
    {"id": "tar-3", "tipo": "Fatura", "descricao": "Conferir fatura Mar/2026 - Amil", "prazo": "10/03/2026", "status": "Pendente", "prioridade": "Alta"},
    {"id": "tar-4", "tipo": "Transferência", "descricao": "Transferir plano - Maria Silva", "prazo": "12/03/2026", "status": "Pendente", "prioridade": "Baixa"},
    {"id": "tar-5", "tipo": "Inclusão", "descricao": "Incluir dependente - José Santos", "prazo": "09/03/2026", "status": "Em Análise", "prioridade": "Média"},
]

MOVIMENTACOES_RECENTES = [
    {"id": "mov-1", "tipo": "Inclusão", "contrato": "EMP-2024-001", "beneficiario": "Ana Paula Santos", "data": "05/03/2026", "status": "Aprovado"},
    {"id": "mov-2", "tipo": "Exclusão", "contrato": "ADH-2024-003", "beneficiario": "Roberto Oliveira", "data": "04/03/2026", "status": "Pendente"},
    {"id": "mov-3", "tipo": "Transferência", "contrato": "EMP-2024-002", "beneficiario": "Maria Clara Lima", "data": "03/03/2026", "status": "Aprovado"},
    {"id": "mov-4", "tipo": "Inclusão", "contrato": "ADH-2024-001", "beneficiario": "João Pedro Alves", "data": "02/03/2026", "status": "Em Análise"},
    {"id": "mov-5", "tipo": "Inclusão", "contrato": "EMP-2024-003", "beneficiario": "Fernanda Costa", "data": "01/03/2026", "status": "Aprovado"},
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
    }

    for collection_name, data in collections_data.items():
        count = await db[collection_name].count_documents({})
        if count == 0:
            await db[collection_name].insert_many(data)
            logger.info(f"Seeded {collection_name} with {len(data)} documents")
        else:
            logger.info(f"Collection {collection_name} already has {count} documents, skipping seed")
