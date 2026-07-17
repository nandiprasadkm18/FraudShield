import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.domain import Users, Userrole
from sqlalchemy import select, update

async def make_admin(email: str):
    async with SessionLocal() as db:
        result = await db.execute(select(Users).filter(Users.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"User with email {email} not found.")
            return
            
        user.role = Userrole.PLATFORM_ADMIN
        await db.commit()
        print(f"User {email} has been promoted to PLATFORM_ADMIN.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <user_email>")
        sys.exit(1)
        
    email = sys.argv[1]
    asyncio.run(make_admin(email))
