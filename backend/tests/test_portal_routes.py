from fastapi import FastAPI
from fastapi.testclient import TestClient
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from portal_routes import attach_portal_routes


class FakeCursor:
    def __init__(self, items):
        self.items = list(items)

    def sort(self, field, direction):
        reverse = direction < 0
        self.items = sorted(self.items, key=lambda item: item.get(field) or "", reverse=reverse)
        return self

    async def to_list(self, limit):
        return self.items[:limit]


class FakeCollection:
    def __init__(self, items=None):
        self.items = list(items or [])

    def find(self, *_args, **_kwargs):
        return FakeCursor(self.items)

    async def find_one(self, query, *_args, **_kwargs):
        return next((item for item in self.items if self._matches(item, query)), None)

    async def insert_one(self, item):
        self.items.append(dict(item))

    async def update_one(self, query, update):
        item = await self.find_one(query)
        if item and "$set" in update:
            item.update(update["$set"])

    async def replace_one(self, query, document):
        item = await self.find_one(query)
        if item:
            item.clear()
            item.update(dict(document))

    async def delete_one(self, query):
        item = await self.find_one(query)
        class R:
            deleted_count = 0
        if item:
            self.items.remove(item)
            R.deleted_count = 1
        return R()

    async def count_documents(self, *_args, **_kwargs):
        return len(self.items)

    @staticmethod
    def _matches(item, query):
        for key, expected in (query or {}).items():
            value = item.get(key)
            if isinstance(expected, dict) and "$ne" in expected:
                if value == expected["$ne"]:
                    return False
            elif value != expected:
                return False
        return True


class FakeDb:
    def __init__(self):
        self.portal_parceiros = FakeCollection([
            {
                "id": "partner-1",
                "documento": "12345678000190",
                "tipo": "CNPJ",
                "empresa": "Empresa Cliente",
                "nome": "Empresa Cliente",
                "contratos": ["EMP-001"],
                "status": "Ativo",
            }
        ])
        self.portal_solicitacoes = FakeCollection()
        self.portal_chat = FakeCollection()
        self.portal_formularios = FakeCollection()
        self.contratos_empresarial = FakeCollection([
            {"id": "contract-1", "numero": "EMP-001", "empresa": "Empresa Cliente", "cnpj": "12.345.678/0001-90"}
        ])
        self.contratos_adesao = FakeCollection()
        self.inclusoes = FakeCollection()
        self.exclusoes = FakeCollection()
        self.transferencias = FakeCollection()
        self.faturas = FakeCollection()
        self.boletos_baixados = FakeCollection()


def make_client():
    app = FastAPI()
    db = FakeDb()
    attach_portal_routes(
        app,
        db,
        lambda: {"_id": 0},
        lambda: "2026-06-12T12:00:00+00:00",
        lambda: "12/06/2026 09:00",
    )
    return TestClient(app), db


def test_movimentacao_inclusao_cria_solicitacao_operacional_e_chat():
    client, db = make_client()

    response = client.post(
        "/api/portal-doncor/movimentacoes",
        json={
            "documento": "12.345.678/0001-90",
            "tipo": "inclusao",
            "contrato": "EMP-001",
            "operadora": "Assim",
            "planos": ["Saúde"],
            "beneficiario": "Joao Cliente",
            "cpf": "123.456.789-00",
            "detalhes": "Incluir dependente no plano.",
            "anexos": [{"name": "rg.pdf", "size": 1200, "type": "application/pdf", "category": "RG / CPF"}],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["protocolo"] == "CLI-0001"
    assert body["status"] == "Enviado"
    assert len(db.portal_solicitacoes.items) == 1
    assert len(db.inclusoes.items) == 1
    assert db.inclusoes.items[0]["status"] == "Pendente"
    assert db.inclusoes.items[0]["portalSolicitacaoId"] == body["id"]
    assert len(db.portal_chat.items) == 1
    assert db.portal_chat.items[0]["direction"] == "incoming"
    assert db.portal_chat.items[0]["read"] is False

    list_response = client.get("/api/portal-doncor/solicitacoes", params={"documento": "12.345.678/0001-90"})
    assert list_response.status_code == 200
    assert list_response.json()[0]["protocolo"] == "CLI-0001"


def test_chat_aceita_anexo_sem_texto_e_marca_como_lido():
    client, db = make_client()

    response = client.post(
        "/api/portal-doncor/chat",
        json={
            "documento": "12.345.678/0001-90",
            "empresa": "Empresa Cliente",
            "senderRole": "corretor",
            "attachments": [{"name": "resposta.pdf", "size": 300, "type": "application/pdf"}],
        },
    )

    assert response.status_code == 200
    assert response.json()["direction"] == "outgoing"
    assert response.json()["attachmentName"] == "resposta.pdf"

    db.portal_chat.items.append({
        "id": "incoming-1",
        "documento": "12345678000190",
        "empresa": "Empresa Cliente",
        "read": False,
        "createdAt": "2026-06-12T12:00:00+00:00",
    })

    read_response = client.patch("/api/portal-doncor/chat/read", json={"documento": "12.345.678/0001-90"})
    assert read_response.status_code == 200
    assert read_response.json()["updated"] == 2
    assert all(item["read"] for item in db.portal_chat.items)


def test_formularios_alimentam_portal_cliente_e_download():
    client, db = make_client()

    response = client.post(
        "/api/portal-formularios",
        json={
            "categoria": "movimentacao",
            "titulo": "Guia de Inclusão - Tabela A",
            "descricao": "Tabela de inclusão vigente.",
            "arquivoNome": "guia-inclusao.pdf",
            "contentType": "application/pdf",
            "arquivoBase64": "ZmFrZS1wZGY=",
            "status": "Ativo",
            "ordem": 1,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["categoriaLabel"] == "Formulários de Movimentação"
    assert body["temArquivo"] is True
    assert "arquivoBase64" not in body

    admin_list = client.get("/api/portal-formularios")
    assert admin_list.status_code == 200
    assert admin_list.json()[0]["titulo"] == "Guia de Inclusão - Tabela A"

    portal_list = client.get("/api/portal-doncor/formularios")
    assert portal_list.status_code == 200
    assert portal_list.json()[0]["titulo"] == "Guia de Inclusão - Tabela A"

    file_response = client.get(f"/api/portal-formularios/{body['id']}/arquivo")
    assert file_response.status_code == 200
    assert file_response.content == b"fake-pdf"
