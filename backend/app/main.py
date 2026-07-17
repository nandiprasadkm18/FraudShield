from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import intel, media, citizen, auth, telegram, geo
from app.core.websocket_manager import manager as ws_manager
from app.core.exceptions import global_exception_handler
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import Depends
from app.database.session import get_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.api.v1.telegram import bot
    if bot and settings.WEBHOOK_URL:
        try:
            await bot.set_webhook(settings.WEBHOOK_URL)
        except Exception as e:
            print(f"Failed to set Telegram webhook: {e}")
    yield
    if bot:
        try:
            await bot.delete_webhook()
        except Exception as e:
            print(f"Failed to delete Telegram webhook: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_exception_handler(Exception, global_exception_handler)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(intel.router, prefix="/api/intel", tags=["intelligence"])
app.include_router(media.router, prefix="/api", tags=["media"])
app.include_router(citizen.router, prefix="/api", tags=["citizen"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(telegram.router, prefix="/api", tags=["telegram"])
app.include_router(geo.router, prefix="/api/geo", tags=["geo"])

@app.get("/api/health/live")
def health_live():
    return {"status": "alive"}

@app.get("/api/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "not ready", "error": str(e)})

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    try:
        from app.models.domain import ThreatReports, NetworkNodes, GroqCallLogs
        from sqlalchemy import select, func
        
        # Fast approximate count or exact count
        reports_count = await db.scalar(select(func.count(ThreatReports.id)))
        nodes_count = await db.scalar(select(func.count(NetworkNodes.id)))
        
        # Avg AI latency
        avg_latency = await db.scalar(select(func.avg(GroqCallLogs.latencyMs)))
        
        return {
            "total_reports": reports_count or 0,
            "active_graph_nodes": nodes_count or 0,
            "avg_ai_latency_ms": round(avg_latency or 0, 2)
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Trigger reload
# trigger reload 2
