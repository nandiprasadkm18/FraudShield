import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "http://127.0.0.1:8000/api/intel/submit",
            json={
                "text": "Your bank account is blocked.",
                "phoneNumber": "unknown",
                "isAnonymous": False,
                "analysisResult": {
                    "severity": "HIGH",
                    "verdict": "SCAM",
                    "fraudType": "BANKING",
                    "confidenceScore": 0.96
                }
            }
        )
        print(res.status_code)
        print(res.text)

if __name__ == "__main__":
    asyncio.run(test())
