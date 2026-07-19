from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, require_admin, get_current_user
from app.models.domain import Users

router = APIRouter()

@router.get("/")
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Get all registered users. Only accessible by platform admins.
    """
    try:
        stmt = select(Users).order_by(Users.createdAt.desc())
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        return [
            {
                "id": u.id,
                "name": u.name or u.email.split("@")[0],
                "email": u.email,
                "role": u.role,
                "status": u.approvalStatus,
                "createdAt": u.createdAt.isoformat() + "Z"
            }
            for u in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
