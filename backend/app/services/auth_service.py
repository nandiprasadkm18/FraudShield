import uuid
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.domain import Users, Organizations, Orgtype, Userrole, Approvalstatus, RefreshTokens
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.schemas.auth import UserCreate
from app.core.config import settings
from app.core.websocket_manager import manager as ws_manager
import logging

logger = logging.getLogger(__name__)

class AuthService:
    async def register_user(self, db: AsyncSession, user_in: UserCreate) -> Users:
        if user_in.role == Userrole.PLATFORM_ADMIN.value:
            raise HTTPException(status_code=403, detail="Cannot self-register as PLATFORM_ADMIN")

        result = await db.execute(select(Users).filter(Users.email == user_in.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        if user_in.phone:
            phone_result = await db.execute(select(Users).filter(Users.phone == user_in.phone))
            if phone_result.scalars().first():
                raise HTTPException(status_code=400, detail="Phone number already registered")
            
        org_id = str(uuid.uuid4())
        new_org = Organizations(
            id=org_id,
            name=f"{user_in.name}'s Org",
            type=Orgtype.CITIZEN,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db.add(new_org)
        
        app_status = Approvalstatus.APPROVED if user_in.role == Userrole.CITIZEN.value else Approvalstatus.PENDING_APPROVAL

        user_id = str(uuid.uuid4())
        new_user = Users(
            id=user_id,
            name=user_in.name,
            email=user_in.email,
            phone=user_in.phone,
            passwordHash=get_password_hash(user_in.password),
            role=user_in.role,
            approvalStatus=app_status,
            organizationId=org_id,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Broadcast the new user event via WebSocket
        try:
            broadcast_payload = {
                "event": "NEW_USER",
                "id": new_user.id,
                "name": new_user.name or new_user.email.split("@")[0],
                "email": new_user.email,
                "role": new_user.role.value if hasattr(new_user.role, 'value') else new_user.role,
                "status": new_user.approvalStatus.value if hasattr(new_user.approvalStatus, 'value') else new_user.approvalStatus,
                "createdAt": new_user.createdAt.isoformat() + "Z"
            }
            await ws_manager.broadcast(broadcast_payload)
        except Exception as e:
            logger.error(f"WebSocket broadcast error for NEW_USER: {e}")
            
        return new_user

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> tuple[str, str]:
        result = await db.execute(select(Users).filter(Users.email == email))
        user = result.scalars().first()
        
        if not user or not user.passwordHash or not verify_password(password, user.passwordHash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.email, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(subject=user.email)

        # Store refresh token in db
        rt_db = RefreshTokens(
            id=str(uuid.uuid4()),
            token=refresh_token,
            userId=user.id,
            expiresAt=datetime.utcnow() + timedelta(days=7),
            revoked=False
        )
        db.add(rt_db)
        await db.commit()

        return access_token, refresh_token

    async def refresh_access_token(self, db: AsyncSession, token: str) -> tuple[str, str]:
        result = await db.execute(
            select(RefreshTokens).where(
                and_(RefreshTokens.token == token, RefreshTokens.revoked == False)
            )
        )
        rt_db = result.scalars().first()
        if not rt_db or rt_db.expiresAt < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        result_user = await db.execute(select(Users).filter(Users.id == rt_db.userId))
        user = result_user.scalars().first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        # Revoke old token and issue new pair
        rt_db.revoked = True
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.email, expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(subject=user.email)
        
        new_rt_db = RefreshTokens(
            id=str(uuid.uuid4()),
            token=new_refresh_token,
            userId=user.id,
            expiresAt=datetime.utcnow() + timedelta(days=7),
            revoked=False
        )
        db.add(new_rt_db)
        await db.commit()

        return access_token, new_refresh_token

auth_service = AuthService()
