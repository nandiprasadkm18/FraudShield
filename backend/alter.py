import asyncio, os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.session import AsyncSessionLocal
from sqlalchemy import text

async def alter_enum():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TYPE \"NodeType\" ADD VALUE 'IFSC_CODE'"))
            await db.commit()
            print("Successfully added IFSC_CODE to NodeType enum")
        except Exception as e:
            if "DuplicateObject" in str(e) or "already exists" in str(e):
                print("IFSC_CODE already exists in NodeType enum")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_enum())
