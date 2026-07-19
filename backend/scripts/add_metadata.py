import asyncio, os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.session import AsyncSessionLocal
from sqlalchemy import text

async def alter():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE network_nodes ADD COLUMN IF NOT EXISTS metadata JSONB"))
            await db.commit()
            print("Successfully added metadata column")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter())
