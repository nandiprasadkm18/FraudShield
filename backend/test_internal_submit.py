import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.session import SessionLocal
from app.services.intel_service import intel_service
from app.schemas.threat import SubmitPayload

async def test():
    async with SessionLocal() as db:
        payload = SubmitPayload(
            text="Please do your KYC",
            phoneNumber="+919876543210",
            state="Karnataka",
            analysisResult={
                "fraudType": "KYC Update Scam",
                "severity": "HIGH",
                "verdict": "SCAM",
                "confidenceScore": 0.9,
                "reasoning": "Test reasoning"
            }
        )
        try:
            threat_id = await intel_service.process_submission(payload, {"id": "test_user_id"}, "127.0.0.1", db)
            print(f"Success! threat_id={threat_id}")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
