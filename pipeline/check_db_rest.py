import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("VITE_SUPABASE_ANON_KEY")

req = urllib.request.Request(
    f"{url}/rest/v1/jobs?select=id,patient_first_name,dob,provider_org_name,created_at&order=created_at.desc&limit=1",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
)

with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print("LATEST JOB IN DB:", data)
