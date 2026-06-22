"""Testes dos endpoints do robô RPA — main.py e server.py.

Cobre:
- /api/robo/iniciar  (autenticação RBAC)
- /api/robo/execucoes
- /api/worker/jobs/next  (autenticação por token)
- /api/worker/jobs/{job_id}/result
"""

import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("WORKER_TOKEN", "test-worker-token-abc123")

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
import server


# ─── Fakes ──────────────────────────────────────────────────────────────────

class FakeCursor:
    """Cursor falso que suporta .sort().limit().to_list()."""

    def __init__(self, docs=None):
        self._docs = docs or []

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    async def to_list(self, *_args, **_kwargs):
        return self._docs


class FakeCollection:
    def __init__(self, docs=None):
        self._docs: list = docs or []
        self.state = {"id": "default", "status": "ready", "lastRunAt": None, "successRate": 98}

    async def find_one(self, query=None, *_args, **_kwargs):
        if not self._docs:
            return None
        return self._docs[0]

    async def insert_one(self, doc, *_args, **_kwargs):
        self._docs.append(doc)

    async def update_one(self, *_args, **kwargs):
        update = _args[1] if len(_args) > 1 else kwargs.get("update", {})
        self.state.update(update.get("$set", {}))

        class Result:
            matched_count = 1
        return Result()

    async def count_documents(self, *_args, **_kwargs):
        return len(self._docs) if self._docs else 2

    def find(self, *_args, **_kwargs):
        return FakeCursor(self._docs)


class FakeDb:
    def __init__(self):
        self.robo_estado = FakeCollection()
        self.tarefas_pendentes = FakeCollection()
        self.robo_execucoes_log = FakeCollection()
        self.robo_jobs = FakeCollection()
        self.boletos_baixados = FakeCollection()
        self.robo_arquivos = FakeCollection()
        self.robo_config = FakeCollection()


server.db = FakeDb()

from fastapi.testclient import TestClient
client = TestClient(server.app)


# ─── Testes: robo/iniciar ────────────────────────────────────────────────────

def test_robo_post_iniciar_401_sem_header():
    response = client.post("/api/robo/iniciar")
    assert response.status_code == 401


def test_robo_post_iniciar_403_role_invalida():
    response = client.post("/api/robo/iniciar", headers={"x-user-role": "agente"})
    assert response.status_code == 403


def test_robo_post_iniciar_200_admin():
    response = client.post("/api/robo/iniciar", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    assert response.json()["status"] == "running"


# ─── Testes: robo/execucoes ──────────────────────────────────────────────────

def test_robo_execucoes_requer_autorizacao_401_403_200():
    r1 = client.get("/api/robo/execucoes")
    assert r1.status_code == 401

    r2 = client.get("/api/robo/execucoes", headers={"x-user-role": "viewer"})
    assert r2.status_code == 403

    r3 = client.get("/api/robo/execucoes", headers={"x-user-role": "admin"})
    assert r3.status_code == 200
    assert isinstance(r3.json(), list)


# ─── Testes: worker/jobs/next ────────────────────────────────────────────────

def test_worker_jobs_next_401_sem_token():
    """Sem X-Worker-Token deve retornar 401."""
    r = client.get("/api/worker/jobs/next")
    assert r.status_code == 401


def test_worker_jobs_next_401_token_errado():
    """Token errado deve retornar 401."""
    r = client.get("/api/worker/jobs/next", headers={"x-worker-token": "token-errado"})
    assert r.status_code == 401


def test_worker_jobs_next_vazio_quando_sem_jobs():
    """Sem jobs pendentes retorna {}."""
    # Garantir que robo_jobs está vazio
    server.db.robo_jobs = FakeCollection(docs=[])
    r = client.get(
        "/api/worker/jobs/next",
        headers={"x-worker-token": "test-worker-token-abc123"},
    )
    assert r.status_code == 200
    assert r.json() == {}


def test_worker_jobs_next_retorna_job_pendente():
    """Quando há um job pending, retorna e muda status para running."""
    fake_job = {
        "id": "job-uuid-001",
        "status": "pending",
        "user_id": "u1",
        "apolice_id": "a1",
        "operadora": {"nome": "AMIL"},
        "supabase": {},
        "createdAt": "2026-06-22T00:00:00Z",
    }
    server.db.robo_jobs = FakeCollection(docs=[fake_job])

    r = client.get(
        "/api/worker/jobs/next",
        headers={"x-worker-token": "test-worker-token-abc123"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "job-uuid-001"
    assert data["status"] == "running"


# ─── Testes: worker/jobs/{job_id}/result ────────────────────────────────────

def test_worker_resultado_job_401_sem_token():
    r = client.post("/api/worker/jobs/job-uuid-001/result", json={"success": True})
    assert r.status_code == 401


def test_worker_resultado_job_404_inexistente():
    server.db.robo_jobs = FakeCollection(docs=[])
    r = client.post(
        "/api/worker/jobs/job-inexistente/result",
        headers={"x-worker-token": "test-worker-token-abc123"},
        json={"success": False, "error": "Falha teste"},
    )
    assert r.status_code == 404


def test_worker_resultado_job_sucesso():
    """Worker envia resultado com sucesso — job vira completed."""
    fake_job = {
        "id": "job-uuid-002",
        "status": "running",
        "user_id": "u1",
        "apolice_id": "a1",
        "operadora": {"nome": "AMIL"},
        "supabase": {},
        "criadoEm": "22/06/2026 11:00",
    }
    server.db.robo_jobs = FakeCollection(docs=[fake_job])
    server.db.boletos_baixados = FakeCollection()
    server.db.robo_arquivos = FakeCollection()
    server.db.robo_execucoes_log = FakeCollection()

    payload = {
        "success": True,
        "result": {
            "duration_seconds": 42.5,
            "operadora": "AMIL",
            "uploaded_files": [
                {
                    "nome_arquivo": "boleto_amil_junho.pdf",
                    "arquivo_url": "https://supabase.co/storage/boleto.pdf",
                    "status": "uploaded",
                }
            ],
        },
        "error": "",
    }
    r = client.post(
        "/api/worker/jobs/job-uuid-002/result",
        headers={"x-worker-token": "test-worker-token-abc123"},
        json=payload,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "completed"
    assert data["boletos_persistidos"] == 1


def test_worker_resultado_job_falha():
    """Worker envia resultado com falha — job vira failed."""
    fake_job = {
        "id": "job-uuid-003",
        "status": "running",
        "user_id": "u1",
        "apolice_id": "a1",
        "operadora": {"nome": "AMIL"},
        "supabase": {},
        "criadoEm": "22/06/2026 11:00",
    }
    server.db.robo_jobs = FakeCollection(docs=[fake_job])
    server.db.robo_execucoes_log = FakeCollection()

    r = client.post(
        "/api/worker/jobs/job-uuid-003/result",
        headers={"x-worker-token": "test-worker-token-abc123"},
        json={"success": False, "error": "AMIL bloqueou o IP"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "failed"
    assert data["boletos_persistidos"] == 0
