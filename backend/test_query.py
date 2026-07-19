import asyncio, sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.session import AsyncSessionLocal
from sqlalchemy import text
import json

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT "entityValue", metadata FROM network_nodes'))
        for row in res.fetchall():
            print(f"Value: {row[0]}, Metadata: {row[1]}")

if __name__ == "__main__":
    asyncio.run(main())
