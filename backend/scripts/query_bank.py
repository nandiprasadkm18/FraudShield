import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT \"payloadHash\" FROM threat_reports"))
        row = res.fetchone()
        if row:
            res2 = await conn.execute(text(f"SELECT \"payloadHash\" FROM groq_call_logs WHERE \"payloadHash\" = '{row[0]}'"))
            print(res2.fetchall())

asyncio.run(main())
