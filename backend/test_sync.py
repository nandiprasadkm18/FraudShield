import requests

# 1. Login
res = requests.post("http://localhost:8000/api/v1/auth/login", 
    data={"username": "admin@gmail.com", "password": "admin"},
    timeout=10)
if res.status_code != 200:
    print("Login failed:", res.text)
    exit()
token = res.json()["access_token"]
print("Logged in!")

# 2. Submit
payload = {
    "text": "Win $1000 today! Call 9999900000",
    "phoneNumber": "9999900000",
    "state": "Maharashtra",
    "analysisResult": {
        "verdict": "HIGH_RISK_SCAM",
        "severity": "HIGH",
        "confidenceScore": 0.9,
        "fraudType": "LOTTERY",
        "tags": ["Lottery"],
        "reasoning": "Test",
        "scammerEntities": ["9999900000"],
        "timeline": []
    }
}
print("Submitting...")
res = requests.post(
    "http://localhost:8000/api/intel/submit",
    json=payload,
    headers={"Authorization": f"Bearer {token}"},
    timeout=60  # generous timeout
)
print("Submit status:", res.status_code)
print("Submit response:", res.text)
