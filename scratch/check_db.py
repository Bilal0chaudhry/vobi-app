import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

res = supabase.table('jobs').select('*').order('created_at', desc=True).limit(1).execute()
print(res.data)
