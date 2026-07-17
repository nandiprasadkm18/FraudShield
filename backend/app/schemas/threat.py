from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.domain import Severity, Verdict

class SubmitPayload(BaseModel):
    text: str
    phoneNumber: Optional[str] = Field(default=None)
    city: Optional[str] = None
    state: str
    pincode: Optional[str] = None
    analysisResult: Dict[str, Any]

class ThreatStreamResponse(BaseModel):
    id: str
    type: str
    module: str
    confidence: float
    severity: str
    timestamp: str
    description: str

class StreamFeedResponse(BaseModel):
    feed: List[ThreatStreamResponse]
    total: int
