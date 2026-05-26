"""Mongo-like compatibility layer backed by Supabase/Postgres.

This adapter lets the existing FastAPI code keep using a small subset of the
Motor/Mongo API while data is stored in Supabase tables with this shape:

  id text primary key
  payload jsonb not null
  created_at timestamptz
  updated_at timestamptz

It is intentionally simple and optimized for the current Doncor CRUD workload.
For high-volume production usage, replace compatibility filtering with native
SQL/PostgREST queries and indexes per business field.
"""

from __future__ import annotations

import copy
import os
import re
import uuid
from dataclasses import dataclass
from typing import Any, Iterable

from supabase import create_client


@dataclass
class UpdateResult:
    matched_count: int = 0


@dataclass
class DeleteResult:
    deleted_count: int = 0


class SupabaseCursor:
    def __init__(self, items: list[dict[str, Any]]):
        self._items = items

    def sort(self, key: str, direction: int = 1):
        reverse = direction == -1
        normalized_key = _normalize_field(key)
        self._items.sort(key=lambda item: item.get(normalized_key) or "", reverse=reverse)
        return self

    async def to_list(self, length: int | None = None):
        if length is None:
            return self._items
        return self._items[:length]


class SupabaseCollection:
    def __init__(self, supabase_client, table_name: str):
        self.client = supabase_client
        self.table_name = table_name

    def _table(self):
        return self.client.table(self.table_name)

    def _rows_to_items(self, rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for row in rows or []:
            payload = copy.deepcopy(row.get("payload") or {})
            payload.setdefault("id", row.get("id"))
            payload.setdefault("_id", row.get("id"))
            items.append(payload)
        return items

    def _all_items(self) -> list[dict[str, Any]]:
        response = self._table().select("id,payload").execute()
        return self._rows_to_items(response.data or [])

    def _select_matching(self, query: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        query = query or {}
        return [item for item in self._all_items() if _matches_query(item, query)]

    def find(self, query: dict[str, Any] | None = None, projection: dict[str, Any] | None = None):
        return SupabaseCursor(_apply_projection(self._select_matching(query), projection))

    async def find_one(
        self,
        query: dict[str, Any] | None = None,
        projection: dict[str, Any] | None = None,
        sort: list[tuple[str, int]] | None = None,
    ):
        items = self._select_matching(query)
        if sort:
            for key, direction in reversed(sort):
                normalized_key = _normalize_field(key)
                items.sort(key=lambda item: item.get(normalized_key) or "", reverse=direction == -1)
        items = _apply_projection(items, projection)
        return items[0] if items else None

    async def count_documents(self, query: dict[str, Any] | None = None):
        return len(self._select_matching(query))

    async def insert_one(self, document: dict[str, Any]):
        payload = copy.deepcopy(document)
        item_id = str(payload.get("id") or payload.get("_id") or uuid.uuid4())
        payload["id"] = item_id
        payload.pop("_id", None)
        self._table().upsert({"id": item_id, "payload": payload}).execute()
        return {"inserted_id": item_id}

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False):
        current = await self.find_one(query)
        if not current and not upsert:
            return UpdateResult(matched_count=0)

        payload = copy.deepcopy(current or {})
        set_values = update.get("$set", update)
        payload.update(set_values)
        item_id = str(payload.get("id") or payload.get("_id") or query.get("id") or query.get("_id") or uuid.uuid4())
        payload["id"] = item_id
        payload.pop("_id", None)
        self._table().upsert({"id": item_id, "payload": payload}).execute()
        return UpdateResult(matched_count=1 if current else 0)

    async def delete_one(self, query: dict[str, Any]):
        current = await self.find_one(query)
        if not current:
            return DeleteResult(deleted_count=0)
        item_id = str(current.get("id") or current.get("_id"))
        self._table().delete().eq("id", item_id).execute()
        return DeleteResult(deleted_count=1)

    def aggregate(self, pipeline: list[dict[str, Any]]):
        items = self._all_items()
        for stage in pipeline:
            if "$match" in stage:
                items = [item for item in items if _matches_query(item, stage["$match"])]
            elif "$group" in stage:
                items = _group_items(items, stage["$group"])
        return SupabaseCursor(items)


class SupabaseMongoDatabase:
    def __init__(self, supabase_url: str | None = None, service_role_key: str | None = None):
        url = supabase_url or os.getenv("SUPABASE_URL")
        key = service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do backend.")
        self.client = create_client(url, key)
        self._collections: dict[str, SupabaseCollection] = {}

    def __getattr__(self, table_name: str) -> SupabaseCollection:
        if table_name.startswith("__"):
            raise AttributeError(table_name)
        if table_name not in self._collections:
            self._collections[table_name] = SupabaseCollection(self.client, table_name)
        return self._collections[table_name]


class SupabaseMongoClient:
    """Drop-in replacement for AsyncIOMotorClient used by backend/server.py."""

    def __init__(self, *_args, **_kwargs):
        self._db = SupabaseMongoDatabase()

    def __getitem__(self, _db_name: str) -> SupabaseMongoDatabase:
        return self._db

    def close(self):
        return None


def _normalize_field(field: str) -> str:
    return "id" if field == "_id" else field


def _apply_projection(items: list[dict[str, Any]], projection: dict[str, Any] | None):
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
            else:
                return False
        else:
            if value != expected:
                return False
    return True


def _group_items(items: list[dict[str, Any]], spec: dict[str, Any]) -> list[dict[str, Any]]:
    group_field = spec.get("_id")
    if isinstance(group_field, str) and group_field.startswith("$"):
        group_key_field = group_field[1:]
    else:
        group_key_field = None

    grouped: dict[Any, dict[str, Any]] = {}
    for item in items:
        key = item.get(group_key_field) if group_key_field else None
        target = grouped.setdefault(key, {"_id": key})
        for output_field, expression in spec.items():
            if output_field == "_id":
                continue
            if isinstance(expression, dict) and "$sum" in expression:
                sum_value = expression["$sum"]
                if isinstance(sum_value, str) and sum_value.startswith("$"):
                    target[output_field] = target.get(output_field, 0) + (item.get(sum_value[1:]) or 0)
                else:
                    target[output_field] = target.get(output_field, 0) + (sum_value or 0)
    return list(grouped.values())
