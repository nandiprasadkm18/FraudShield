import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_admin():
    engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT email, role FROM users WHERE email='admin@gmail.com'"))
        print(res.fetchall())

asyncio.run(check_admin())
