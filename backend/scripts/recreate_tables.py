import asyncio
from app.database.session import engine
from app.models.domain import Base

async def init():
    async with engine.begin() as conn:
        print("Recreating all tables from models...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables successfully recreated.")

if __name__ == '__main__':
    asyncio.run(init())
