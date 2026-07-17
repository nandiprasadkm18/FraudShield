from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import BaseRepository
from app.models.domain import ThreatReports

class ThreatRepository(BaseRepository[ThreatReports]):
    async def get_recent_stream(self, db: AsyncSession, limit: int = 50, cursor: Optional[str] = None) -> List[ThreatReports]:
        stmt = select(self.model).order_by(self.model.createdAt.desc())
        
        if cursor:
            # Assumes cursor is an ISO 8601 datetime string from the client
            from datetime import datetime
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
                # Filter reports older than the cursor
                stmt = stmt.where(self.model.createdAt < cursor_dt)
            except ValueError:
                pass
                
        result = await db.execute(stmt.limit(limit))
        return list(result.scalars().all())

threat_repo = ThreatRepository(ThreatReports)
