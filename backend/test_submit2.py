import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import AsyncSessionLocal
from app.services.intel_service import intel_service
from app.schemas.threat import SubmitPayload

async def test():
    async with AsyncSessionLocal() as db:
        payload = SubmitPayload(
            text="Win $1000 today! Call 9999900000",
            phoneNumber="9999900000", state="Maharashtra",
            analysisResult={
                "verdict": "HIGH_RISK_SCAM",
                "severity": "HIGH",
                "confidenceScore": 0.9,
                "fraudType": "LOTTERY",
                "tags": ["Lottery"],
                "reasoning": "Test",
                "scammerEntities": ["9999900000"],
                "timeline": []
            }
        )
        user = {"id": "test-id", "email": "test@gmail.com", "role": "CITIZEN"}
        try:
            threat_id = await intel_service.process_submission(payload, user, "127.0.0.1", db)
            print("Success! Threat ID:", threat_id)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
