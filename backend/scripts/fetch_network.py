import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import create_access_token
import urllib.request
import json

token = create_access_token({"sub":"admin@rakshasetu.gov.in", "role":"PLATFORM_ADMIN"})
req = urllib.request.Request("http://localhost:8000/api/v1/intel/network")
req.add_header("Authorization", f"Bearer {token}")

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
