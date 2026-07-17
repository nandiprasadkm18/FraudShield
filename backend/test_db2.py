import asyncio
from app.services.intel_service import intel_service
from app.schemas.threat import SubmitPayload
from app.api.deps import get_db

async def main():
    payload = SubmitPayload(
        phoneNumber='+918369271548',
        text='Test',
        state='Karnataka',
        city='Bangalore',
        pincode='',
        analysisResult={'verdict': 'PHISHING', 'severity': 'CRITICAL', 'confidenceScore': 0.97, 'fraudType': 'Phishing', 'tags': [], 'reasoning': 'Test', 'timeline': [], 'escalate': False, 'scammerEntities': [], 'extracted_scammer_entities': [], '_metrics': {'latencyMs': 100, 'promptTokens': 100, 'completionTokens': 100, 'estimatedCost': 0.01, 'retryCount': 0}}
    )
    current_user = {'id': '1'}
    async for db in get_db():
        try:
            await intel_service.process_submission(payload, current_user, '127.0.0.1', db)
            print('Success!')
        except Exception as e:
            print('ERROR IN DB:', e)
            import traceback
            traceback.print_exc()

asyncio.run(main())
