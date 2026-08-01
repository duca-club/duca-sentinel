"""Shared Supabase client, authenticated with the project's service role key."""

from supabase import AsyncClient

from duca_sentinel.lib.env_config import env_config

supabase_url = env_config.SUPABASE_URL
supabase_secret_key = env_config.SUPABASE_SECRET_KEY

# Constructed directly rather than via `create_async_client`, which only differs by looking up an
# existing auth session to derive a bearer header. There is no session behind a service role key,
# so the two are equivalent here and this keeps the client importable as a module-level singleton.
supabase = AsyncClient(supabase_url, supabase_secret_key)
