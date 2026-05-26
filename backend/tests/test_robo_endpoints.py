import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

from fastapi.testclient import TestClient
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
import server


class FakeCollection:
    def __init__(self):
        self.state = {"id": "default", "status": "ready", "lastRunAt": None, "successRate": 98}

    async def find_one(self, *_args, **_kwargs):
        return self.state

    async def update_one(self, *_args, **kwargs):
        self.state.update(kwargs["update"]["$set"] if "update" in kwargs else _args[1]["$set"])
        class R: ...
        return R()

    async def count_documents(self, *_args, **_kwargs):
        return 2

    def find(self, *_args, **_kwargs):
        class Cursor:
            def sort(self, *_args, **_kwargs):
                return self

            async def to_list(self, *_args, **_kwargs):
                return []
        return Cursor()


class FakeDb:
    def __init__(self):
        self.robo_estado = FakeCollection()
        self.tarefas_pendentes = FakeCollection()
        self.robo_execucoes_log = FakeCollection()


server.db = FakeDb()
client = TestClient(server.app)


def test_robo_post_iniciar_401_sem_header():
    response = client.post('/api/robo/iniciar')
    assert response.status_code == 401


def test_robo_post_iniciar_403_role_invalida():
    response = client.post('/api/robo/iniciar', headers={'x-user-role': 'agente'})
    assert response.status_code == 403


def test_robo_post_iniciar_200_admin():
    response = client.post('/api/robo/iniciar', headers={'x-user-role': 'admin'})
    assert response.status_code == 200
    assert response.json()['status'] == 'running'


def test_robo_execucoes_requer_autorizacao_401_403_200():
    r1 = client.get('/api/robo/execucoes')
    assert r1.status_code == 401

    r2 = client.get('/api/robo/execucoes', headers={'x-user-role': 'viewer'})
    assert r2.status_code == 403

    r3 = client.get('/api/robo/execucoes', headers={'x-user-role': 'admin'})
    assert r3.status_code == 200
    assert isinstance(r3.json(), list)
