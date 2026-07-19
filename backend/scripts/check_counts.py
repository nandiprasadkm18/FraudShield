import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import AsyncSessionLocal
from app.models.domain import PhoneReputations, ThreatReports, NetworkNodes
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(PhoneReputations).filter(PhoneReputations.phoneNumber.in_(['+919123456789', '+918923456789'])))
        reps = res.scalars().all()
        print("PhoneReputations:")
        for r in reps:
            print(f"  {r.phoneNumber}: {r.reportCount}")

        print("\nThreatReports:")
        res2 = await db.execute(select(ThreatReports).filter(ThreatReports.targetPhoneNumber.in_(['+919123456789', '+918923456789'])))
        threats = res2.scalars().all()
        for t in threats:
            print(f"  {t.id}: {t.targetPhoneNumber} by user {t.userId}")
            
        print("\nNetworkNodes (VICTIM for these reports):")
        for t in threats:
            res3 = await db.execute(select(NetworkNodes).filter(NetworkNodes.reportId == t.id, NetworkNodes.entityType == "VICTIM"))
            nodes = res3.scalars().all()
            for n in nodes:
                print(f"  Report {t.id} -> Victim Node: {n.entityValue}")

if __name__ == "__main__":
    asyncio.run(check())
