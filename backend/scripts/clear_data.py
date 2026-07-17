import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.domain import (
    ThreatReports, NetworkEdges, NetworkNodes, GeoEvents, 
    VerdictFeedback, PhoneReputations, NumberReputations, GroqCallLogs
)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import delete

engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def clear_data():
    async with SessionLocal() as db:
        print("Clearing NetworkEdges...")
        await db.execute(delete(NetworkEdges))
        
        print("Clearing NetworkNodes...")
        await db.execute(delete(NetworkNodes))
        
        print("Clearing GeoEvents...")
        await db.execute(delete(GeoEvents))
        
        print("Clearing VerdictFeedback...")
        await db.execute(delete(VerdictFeedback))
        
        print("Clearing ThreatReports...")
        await db.execute(delete(ThreatReports))
        
        print("Clearing PhoneReputations...")
        await db.execute(delete(PhoneReputations))
        
        print("Clearing NumberReputations...")
        await db.execute(delete(NumberReputations))
        
        print("Clearing GroqCallLogs...")
        await db.execute(delete(GroqCallLogs))
        
        await db.commit()
        print("Data cleared successfully!")

if __name__ == "__main__":
    asyncio.run(clear_data())
