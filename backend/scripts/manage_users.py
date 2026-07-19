import asyncio
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import AsyncSessionLocal
from app.models.domain import Users
from sqlalchemy import select, delete

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Users))
        users = result.scalars().all()
        print("Users in DB:")
        for u in users:
            print(f"{u.id} | {u.name} | {u.email} | {u.role}")
            
        print("\nDeleting dummy users...")
        # Delete users with @example.com or any other than the main ones
        dummy_emails = ["ayeshar@example.com", "nandiprasadkm@example.com", "suman@example.com", "teja@gmail.com", "suman@gmail.com", "nandi@gmail.com"]
        
        stmt = delete(Users).where(Users.email.in_(dummy_emails))
        await session.execute(stmt)
        await session.commit()
        print(f"Deleted users with emails: {dummy_emails}")
        
        result = await session.execute(select(Users))
        users = result.scalars().all()
        print("\nRemaining Users:")
        for u in users:
            print(f"{u.id} | {u.name} | {u.email} | {u.role}")

if __name__ == "__main__":
    asyncio.run(main())
