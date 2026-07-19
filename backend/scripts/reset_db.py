import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def reset():
    engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db', isolation_level='AUTOCOMMIT')
    async with engine.connect() as conn:
        print("Dropping schema public...")
        await conn.execute(text('DROP SCHEMA public CASCADE;'))
        print("Creating schema public...")
        await conn.execute(text('CREATE SCHEMA public;'))
        print("Database wiped!")

if __name__ == '__main__':
    asyncio.run(reset())
