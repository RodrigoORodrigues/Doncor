"""Mongo-like adapter using Supabase, with in-memory fallback for tests.

The project started with a Mongo-style persistence layer. Some Supabase tables use
an `id + payload` JSONB layout, while newer RPA tables are flat Postgres tables.
This adapter supports both layouts so a missing `payload` column does not break
history/diagnostics reads.
"""

from __future__ import annotations

import copy
import os
import re
import uuid
from dataclasses import dataclass
from typing import Any

from supabase import create_client


@dataclass
class UpdateResult:
    matched_count: int = 0


@dataclass
class DeleteResult:
    deleted_count: int = 0


class SupabaseCursor:
    def __init__(self, items: list[dict[str, Any]]):
        self.items = items

    def sort(self, key: str, direction: int = 1):
        field = _normalize_field(key)
        self.items.sort(key=lambda item: item.get(field) or "", reverse=direction == -1)
        return self

    async def to_list(self, length: int | None = None):
        return self.items if length is None else self.items[:length]


class SupabaseCollection:
    def __init__(self, client, table_name: str, memory_store: dict[str, dict[str, dict[str, Any]]]):
        self.client = client
        self.table_name = table_name
        self.memory_store = memory_store
        self._payload_layout: bool | None = None

    def _table(self):
        return self.client.table(self.table_name)

    def _memory_table(self):
        return self.memory_store.setdefault(self.table_name, {})

    def _uses_payload_layout(self) -> bool:
        if self._payload_layout is not None:
            return self._payload_layout
        if self.client is None:
            self._payload_layout = True
            return True
        try:
            self._table().select("id,payload").limit(1).execute()
            self._payload_layout = True
        except Exception:
            self._payload_layout = False
        return self._payload_layout

    def _row_to_item(self, row: dict[str, Any]) -> dict[str, Any]:
        if isinstance(row.get("payload"), dict):
            payload = copy.deepcopy(row.get("payload") or {})
            payload.setdefault("id", row.get("id"))
            payload.setdefault("_id", row.get("id"))
            return payload
        item = copy.deepcopy(row)
        item.setdefault("_id", item.get("id"))
        return item

    def _all_items(self):
        if self.client is None:
            return [copy.deepcopy(item) for item in self._memory_table().values()]

        if self._uses_payload_layout():
            response = self._table().select("id,payload").execute()
        else:
            response = self._table().select("*").execute()

        return [self._row_to_item(row) for row in response.data or []]

    def _select_matching(self, query: dict[str, Any] | None = None):
        query = query or {}
        return [item for item in self._all_items() if _matches_query(item, query)]

    def find(self, query: dict[str, Any] | None = None, projection: dict[str, Any] | None = None):
        return SupabaseCursor(_apply_projection(self._select_matching(query), projection))

    async def find_one(self, query=None, projection=None, sort=None):
        items = self._select_matching(query or {})
        if sort:
            for key, direction in reversed(sort):
                field = _normalize_field(key)
                items.sort(key=lambda item: item.get(field) or "", reverse=direction == -1)
        items = _apply_projection(items, projection)
        return items[0] if items else None

    async def count_documents(self, query=None):
        return len(self._select_matching(query or {}))

    async def insert_one(self, document: dict[str, Any]):
        payload = copy.deepcopy(document)
        item_id = str(payload.get("id") or payload.get("_id") or uuid.uuid4())
        payload["id"] = item_id
        payload.pop("_id", None)

        if self.client is None:
            self._memory_table()[item_id] = payload
        elif self._uses_payload_layout():
            self._table().upsert({"id": item_id, "payload": payload}).execute()
        else:
            self._table().upsert(payload).execute()
        return {"inserted_id": item_id}

    async def insert_many(self, documents: list[dict[str, Any]]):
        inserted_ids = []
        for document in documents:
            result = await self.insert_one(document)
            inserted_ids.append(result["inserted_id"])
        return {"inserted_ids": inserted_ids}

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False):
        current = await self.find_one(query)
        if not current and not upsert:
            return UpdateResult(0)

        payload = copy.deepcopy(current or {})
        payload.update(update.get("$set", update))
        item_id = str(payload.get("id") or query.get("id") or query.get("_id") or uuid.uuid4())
        payload["id"] = item_id
        payload.pop("_id", None)

        if self.client is None:
            self._memory_table()[item_id] = payload
        elif self._uses_payload_layout():
            self._table().upsert({"id": item_id, "payload": payload}).execute()
        else:
            self._table().upsert(payload).execute()
        return UpdateResult(1 if current else 0)

    async def replace_one(self, query: dict[str, Any], document: dict[str, Any], upsert: bool = False):
        current = await self.find_one(query)
        if not current and not upsert:
            return UpdateResult(0)

        payload = copy.deepcopy(document)
        item_id = str(payload.get("id") or query.get("id") or query.get("_id") or uuid.uuid4())
        payload["id"] = item_id
        payload.pop("_id", None)

        if self.client is None:
            self._memory_table()[item_id] = payload
        elif self._uses_payload_layout():
            self._table().upsert({"id": item_id, "payload": payload}).execute()
        else:
            self._table().upsert(payload).execute()
        return UpdateResult(1 if current else 0)

    async def delete_one(self, query: dict[str, Any]):
        current = await self.find_one(query)
        if not current:
            return DeleteResult(0)

        item_id = str(current.get("id") or current.get("_id"))
        if self.client is None:
            self._memory_table().pop(item_id, None)
        else:
            self._table().delete().eq("id", item_id).execute()
        return DeleteResult(1)

    def aggregate(self, pipeline: list[dict[str, Any]]):
        items = self._all_items()
        for stage in pipeline:
            if "$match" in stage:
                items = [item for item in items if _matches_query(item, stage["$match"])]
            elif "$group" in stage:
                items = _group_items(items, stage["$group"])
        return SupabaseCursor(items)


class SupabaseMongoDatabase:
    def __init__(self, supabase_url: str | None = None, service_key: str | None = None):
        url = supabase_url or os.getenv("SUPABASE_URL")
        key = service_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
        self.client = create_client(url, key) if url and key else None
        self.memory_store: dict[str, dict[str, dict[str, Any]]] = {}
        self.collections: dict[str, SupabaseCollection] = {}

    def __getattr__(self, table_name: str):
        if table_name.startswith("__"):
            raise AttributeError(table_name)
        if table_name not in self.collections:
            self.collections[table_name] = SupabaseCollection(self.client, table_name, self.memory_store)
        return self.collections[table_name]


class SupabaseMongoClient:
    def __init__(self, *_args, **_kwargs):
        self.db = SupabaseMongoDatabase()

    def __getitem__(self, _db_name: str):
        return self.db

    def close(self):
        return None


def _normalize_field(field: str) -> str:
    return "id" if field == "_id" else field


def _apply_projection(items, projection=None):
    if not projection:
        return items
    result = []
    for item in items:
        cloned = copy.deepcopy(item)
        if projection.get("_id") == 0:
            cloned.pop("_id", None)
        result.append(cloned)
    return result


def _matches_query(item: dict[str, Any], query: dict[str, Any]) -> bool:
    if not query:
        return True

    for field, expected in query.items():
        if field == "$or":
            return any(_matches_query(item, clause) for clause in expected)

        value = item.get(_normalize_field(field))
        if isinstance(expected, dict):
            if "$regex" in expected:
                flags = re.IGNORECASE if "i" in expected.get("$options", "") else 0
                if re.search(expected["$regex"], str(value or ""), flags) is None:
                    return False
            elif "$in" in expected:
                if value not in expected["$in"]:
                    return False
            elif "$ne" in expected:
                if value == expected["$ne"]:
                    return False
            else:
                return False
        elif value != expected:
            return False
    return True


def _group_items(items, spec):
    group_field = spec.get("_id")
    group_key_field = group_field[1:] if isinstance(group_field, str) and group_field.startswith("$") else None
    grouped = {}

    for item in items:
        key = item.get(group_key_field) if group_key_field else None
        target = grouped.setdefault(key, {"_id": key})
        for output_field, expression in spec.items():
            if output_field == "_id":
                continue
            if isinstance(expression, dict) and "$sum" in expression:
                value = expression["$sum"]
                if isinstance(value, str) and value.startswith("$"):
                    target[output_field] = target.get(output_field, 0) + (item.get(value[1:]) or 0)
                else:
                    target[output_field] = target.get(output_field, 0) + (value or 0)
    return list(grouped.values())
