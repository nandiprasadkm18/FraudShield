import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash
from app.models.domain import Users
from app.database.session import AsyncSessionLocal
from sqlalchemy import select

async def reset_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Users).filter(Users.email == "admin@gmail.com"))
        user = result.scalars().first()
        if user:
            print("Found admin user. Updating password...")
            user.passwordHash = get_password_hash("admin")
            await db.commit()
            print("Password updated successfully to 'admin'.")
        else:
            print("Admin user not found.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
