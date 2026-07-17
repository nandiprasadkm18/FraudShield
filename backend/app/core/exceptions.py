import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

import json
import traceback

async def global_exception_handler(request: Request, exc: Exception):
    error_log = {
        "event": "unhandled_exception",
        "url": str(request.url),
        "method": request.method,
        "client": request.client.host if request.client else "unknown",
        "error": str(exc),
        "traceback": traceback.format_exc()
    }
    logger.error(json.dumps(error_log))
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
