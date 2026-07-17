import asyncio
import uuid
import sys
from datetime import datetime

import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash
from app.models.domain import Users, Organizations, Orgtype, Userrole
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def seed_admin():
    async with SessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(Users).filter(Users.email == "admin@gmail.com"))
        if result.scalars().first():
            print("Admin already exists.")
            return

        print("Creating admin organization...")
        org_id = str(uuid.uuid4())
        new_org = Organizations(
            id=org_id,
            name="Platform Administration",
            type=Orgtype.PLATFORM,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db.add(new_org)

        print("Creating admin user...")
        user_id = str(uuid.uuid4())
        new_user = Users(
            id=user_id,
            name="Platform Admin",
            email="admin@gmail.com",
            passwordHash=get_password_hash("admin"),
            role=Userrole.PLATFORM_ADMIN,
            organizationId=org_id,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db.add(new_user)
        await db.commit()
        print("Admin user seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_admin())
