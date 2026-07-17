import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def remove_user():
    engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM users WHERE email='analyst@gmail.com'"))
        print('User removed')

asyncio.run(remove_user())
