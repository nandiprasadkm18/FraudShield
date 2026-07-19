import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import AsyncSessionLocal
from sqlalchemy import text

async def clear_data():
    async with AsyncSessionLocal() as db:
        print("Clearing data...")
        # Clear child tables first
        await db.execute(text("DELETE FROM network_edges;"))
        await db.execute(text("DELETE FROM network_nodes;"))
        await db.execute(text("DELETE FROM geo_events;"))
        await db.execute(text("DELETE FROM verdict_feedback;"))
        
        # Clear main reports table
        await db.execute(text("DELETE FROM threat_reports;"))
        
        # Clear reputations
        await db.execute(text("DELETE FROM phone_reputations;"))
        await db.execute(text("DELETE FROM number_reputations;"))
        
        # Clear logs
        await db.execute(text("DELETE FROM groq_call_logs;"))
        
        await db.commit()
        print("All threat reports and related network data have been successfully cleared.")

if __name__ == "__main__":
    asyncio.run(clear_data())
