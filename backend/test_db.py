import asyncio
import uuid
from app.services.intel_service import intel_service
from app.schemas.threat import SubmitPayload
from app.api.deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession

async def main():
    payload = SubmitPayload(
        phoneNumber='+918369271548',
        text='Dear Card Holder, Your HDFC Bank Credit Card ending with 4821 is blocked...',
        state='Karnataka',
        city='Bangalore',
        pincode='',
        analysisResult={
            "verdict": "PHISHING",
            "severity": "CRITICAL",
            "confidenceScore": 0.97,
            "fraudType": "Phishing",
            "tags": ["phishing"],
            "reasoning": "Fake test",
            "timeline": [],
            "escalate": False,
            "scammerEntities": [],
            "extracted_scammer_entities": [],
            "financialExposure": None,
            "_metrics": {
                "latencyMs": 100,
                "promptTokens": 100,
                "completionTokens": 100,
                "estimatedCost": 0.01,
                "retryCount": 0
            }
        }
    )
    # create a mock async generator
    async for db in get_db():
        try:
            res = await intel_service.process_submission(payload, None, "127.0.0.1", db)
            print("Success!", res)
        except Exception as e:
            print("ERROR IN DB:", e)
            import traceback
            traceback.print_exc()

asyncio.run(main())
