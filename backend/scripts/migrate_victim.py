import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def migrate():
    async with SessionLocal() as db:
        # Add VICTIM to the NodeType postgres enum
        try:
            await db.execute(text("ALTER TYPE \"NodeType\" ADD VALUE IF NOT EXISTS 'VICTIM'"))
            await db.commit()
            print("Migration done: Added VICTIM to NodeType enum")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")

asyncio.run(migrate())
