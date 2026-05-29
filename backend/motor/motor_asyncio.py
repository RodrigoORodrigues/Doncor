"""Compatibility module for the old `from motor.motor_asyncio import AsyncIOMotorClient` import.

The backend now stores data in Supabase/Postgres through a Mongo-like adapter.
"""

from supabase_adapter import SupabaseMongoClient as AsyncIOMotorClient
