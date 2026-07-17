from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
import uuid
import hashlib

from app.services.ai_pipeline import ai_pipeline
from app.database.session import get_db
from app.models.domain import ThreatReports, PhoneReputations, NetworkNodes, NetworkEdges, Nodetype, Channel, Verdict, Severity

router = APIRouter()

class AnalyzeFraudRequest(BaseModel):
    text: str
    phone: str = None

def get_node_type(entity_type: str) -> Nodetype:
    mapping = {
        "IN_PHONE": Nodetype.PHONE_NUMBER,
        "IN_BANK_ACCOUNT": Nodetype.BANK_ACCOUNT,
        "EMAIL_ADDRESS": Nodetype.EMAIL,
        "IN_AADHAAR": None,
        "IN_PAN": None,
        "LOCATION": None
    }
    return mapping.get(entity_type)

@router.post("/analyze-fraud")
async def analyze_fraud(req: AnalyzeFraudRequest):
    try:
        # 1. AI Analysis
        result = await ai_pipeline.analyze_fraud(req.text, req.phone)
        return result
    except Exception as e:
        print(f"Error in analyze_fraud: {e}")
        raise HTTPException(status_code=500, detail=str(e))
