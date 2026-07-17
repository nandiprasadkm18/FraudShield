from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.rate_limiter import login_limiter
from app.schemas.auth import Token, UserCreate, UserResponse
from app.models.domain import Users, Approvalstatus
from app.database.session import get_db
from app.api.deps import require_admin
from app.core.config import settings
from app.services.auth_service import auth_service
from jose import JWTError, jwt

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    new_user = await auth_service.register_user(db, user_in)
    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        phone=new_user.phone,
        role=new_user.role.value if hasattr(new_user.role, 'value') else new_user.role,
        organizationId=new_user.organizationId
    )

@router.put("/approve/{user_id}")
async def approve_user(user_id: str, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    result = await db.execute(select(Users).filter(Users.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.approvalStatus = Approvalstatus.APPROVED
    await db.commit()
    return {"status": "success", "message": f"User {user.email} approved"}

@router.post("/login", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    login_limiter.check(request)
    access_token, refresh_token = await auth_service.authenticate_user(db, form_data.username, form_data.password)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    new_access_token, new_refresh_token = await auth_service.refresh_access_token(db, refresh_token)
    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    result = await db.execute(select(Users).filter(Users.email == email))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return UserResponse(
        id=user.id,
        name=user.name or "",
        email=user.email,
        phone=user.phone,
        role=user.role.value,
        organizationId=user.organizationId
    )
