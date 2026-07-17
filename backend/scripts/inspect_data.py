import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def inspect():
    async with SessionLocal() as db:
        # Check threat reports
        r = await db.execute(text("SELECT id, \"targetPhoneNumber\", verdict, severity FROM threat_reports LIMIT 10"))
        print("=== THREAT REPORTS ===")
        for row in r.fetchall():
            print(row)

        # Check network nodes
        r2 = await db.execute(text('SELECT id, "entityType", "entityValue", label FROM network_nodes LIMIT 20'))
        print("\n=== NETWORK NODES ===")
        for row in r2.fetchall():
            print(row)

        # Check phone reputations
        r3 = await db.execute(text('SELECT "phoneNumber", "reportCount", "aggregatedRiskScore" FROM phone_reputations LIMIT 10'))
        print("\n=== PHONE REPUTATIONS ===")
        for row in r3.fetchall():
            print(row)

asyncio.run(inspect())
