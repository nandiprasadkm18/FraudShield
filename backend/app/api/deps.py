from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.domain import Users

import time
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

_rate_limits: Dict[str, list] = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 5

async def rate_limit(req: Request):
    ip = req.client.host if req.client else "unknown"
    now = time.time()
    if ip not in _rate_limits:
        _rate_limits[ip] = []
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests")
    _rate_limits[ip].append(now)

# ---------------------------------------------------------------------------
# Core: extract and verify JWT, return user dict from DB
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        result = await db.execute(select(Users).filter(Users.email == email))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        status_val = user.approvalStatus.value if hasattr(user.approvalStatus, "value") else user.approvalStatus
        if status_val != "APPROVED":
            raise HTTPException(status_code=403, detail="User account is not approved")

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Optional auth — returns None if no token is present (for public endpoints)
# ---------------------------------------------------------------------------
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Role-based guards
# ---------------------------------------------------------------------------
_ANALYST_ROLES = {"BANK_ANALYST", "LAW_ENFORCEMENT", "PLATFORM_ADMIN"}
_ADMIN_ROLES = {"PLATFORM_ADMIN"}


async def require_analyst_or_above(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Grants access to BANK_ANALYST, LAW_ENFORCEMENT, and PLATFORM_ADMIN."""
    if user.get("role") not in _ANALYST_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst-level access or above required.",
        )
    return user


async def require_admin(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Grants access to PLATFORM_ADMIN only."""
    if user.get("role") not in _ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required.",
        )
    return user
