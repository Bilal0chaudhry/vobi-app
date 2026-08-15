import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")
load_dotenv(".env")

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase = create_client(url, key)

res = supabase.auth.sign_up({
  "email": "test-signup-error@example.com",
  "password": "Password123!",
  "options": {
    "data": {
      "full_name": "Test User",
      "organization": "Test Org"
    }
  }
})

print(res)
