"""Runtime compatibility defaults for the Supabase database adapter.

The legacy backend was originally wired to MongoDB environment variables.
During the Supabase migration, these harmless defaults prevent startup crashes
when MONGO_URL/DB_NAME are not present. The actual persistence layer is the
local Supabase-backed adapter in backend/motor/motor_asyncio.py.
"""
import os

os.environ.setdefault("MONGO_URL", "supabase://adapter")
os.environ.setdefault("DB_NAME", "doncor")
