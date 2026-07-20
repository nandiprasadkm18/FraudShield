import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.models.domain import (
    ThreatReports, PhoneReputations, Channel, NetworkNodes, NetworkEdges,
    Nodetype, GeoEvents, Locationsource, CityCoordinates, Users, Severity, Verdict,
    GroqCallLogs
)
from app.schemas.threat import SubmitPayload
from app.api.v1.geo import _STATE_COORDS
from app.services.network_service import network_service
from app.core.websocket_manager import manager as ws_manager
from app.core.cache import graph_cache
import logging

logger = logging.getLogger(__name__)

def severity_to_score(sev_str: str) -> int:
    mapping = {
        "CRITICAL": 95,
        "HIGH": 80,
        "MEDIUM": 60,
        "LOW": 30,
        "NONE": 0
    }
    return mapping.get(sev_str.upper(), 50)

class IntelService:
    async def process_submission(
        self, 
        payload: SubmitPayload, 
        current_user: dict, 
        ip: str, 
        db: AsyncSession
    ) -> str:
        """
        Process intel submission: map entities, store report, and broadcast.
        Returns threat_id.
        """
        out = payload.analysisResult
        phone = payload.phoneNumber or "unknown"
        text = payload.text or ""
        
        hash_str = f"{phone}:{text}"
        payload_hash = hashlib.sha256(hash_str.encode()).hexdigest()
        
        severity_val = out.get("severity", "NONE").upper()
        verdict_val = out.get("verdict", "INSUFFICIENT_EVIDENCE").upper()
        
        if severity_val not in Severity.__members__:
            severity_val = "NONE"
        if verdict_val not in Verdict.__members__:
            verdict_val = "INSUFFICIENT_EVIDENCE"
            
        score = severity_to_score(severity_val)
        out["riskScore"] = score / 100.0

        # Run lookups sequentially since AsyncSession doesn't support concurrent queries
        city_coord = None
        if payload.state and payload.city:
            city_res = await db.execute(select(CityCoordinates).where(func.lower(CityCoordinates.name) == payload.city.lower()))
            city_coord = city_res.scalars().first()
            
        user_res = await db.execute(select(Users).where(Users.id == current_user["id"]))
        user = user_res.scalars().first()
            
        # 1. Upsert PhoneReputation
        stmt_phone = insert(PhoneReputations).values(
            phoneNumber=phone,
            reportCount=1,
            aggregatedRiskScore=score,
            dominantSeverity=severity_val,
            dominantFraudType=out.get("fraudType"),
            updatedAt=datetime.now()
        ).on_conflict_do_update(
            index_elements=['phoneNumber'],
            set_=dict(
                reportCount=PhoneReputations.reportCount + 1,
                lastReportedAt=datetime.now(),
                updatedAt=datetime.now(),
                aggregatedRiskScore=score,
                dominantSeverity=severity_val,
                dominantFraudType=out.get("fraudType")
            )
        )
        await db.execute(stmt_phone)
        # CRITICAL: flush phone_reputations before inserting ThreatReports (FK dependency)
        await db.flush()
        
        # 2. Insert ThreatReport and GroqCallLogs
        threat_id = str(uuid.uuid4())
        ip_hash = hashlib.sha256(ip.encode()).hexdigest() if ip != "unknown" else None
        
        log_id = None
        metrics = out.get("_metrics")
        if metrics:
            log_id = str(uuid.uuid4())
            new_log = GroqCallLogs(
                id=log_id,
                payloadHash=payload_hash,
                model="llama-3.3-70b-versatile",
                latencyMs=metrics.get("latencyMs", 0),
                promptTokens=metrics.get("promptTokens", 0),
                completionTokens=metrics.get("completionTokens", 0),
                estimatedCost=metrics.get("estimatedCost", 0.0),
                retryCount=metrics.get("retryCount", 0),
                success=True,
                schemaValid=True,
                reportId=threat_id
            )
            db.add(new_log)
            # CRITICAL: flush GroqCallLogs before ThreatReports references it (FK)
            await db.flush()
        
        
        logger.error(f"DEBUG: phone='{phone}', targetPhoneNumber='{phone}', text length={len(text)}")
        
        new_threat = ThreatReports(
            id=threat_id,
            targetPhoneNumber=phone,
            payloadText=text,
            payloadHash=payload_hash,
            channel=Channel.UNKNOWN,
            verdict=verdict_val,
            severity=severity_val,
            confidenceScore=out.get("confidenceScore", 0),
            fraudType=out.get("fraudType"),
            tags=out.get("tags", []),
            timelineSteps=out.get("timeline", []),
            reasoning=out.get("reasoning"),
            escalate=out.get("escalate", False),
            sourceIp=ip_hash,
            groqCallLogId=log_id,
            financialExposure=out.get("financialExposure"),
            createdByUserId=None if payload.isAnonymous else (current_user["id"] if current_user else None),
            organizationId=None if payload.isAnonymous else (current_user.get("organizationId") if current_user else None)
        )
        logger.error(f"DEBUG: new_threat.targetPhoneNumber='{new_threat.targetPhoneNumber}'")
        db.add(new_threat)
        await db.flush()
        
        # 3. Geo Events
        lat, lng = None, None
        if payload.state:
            if city_coord:
                lat = city_coord.lat
                lng = city_coord.lng
            if not lat or not lng:
                coords = _STATE_COORDS.get(payload.state)
                if coords:
                    lat, lng = coords
            
            if lat and lng:
                geo_id = str(uuid.uuid4())
                geo_event = GeoEvents(
                    id=geo_id,
                    lat=lat,
                    lng=lng,
                    reportId=threat_id,
                    severity=severity_val,
                    locationSource=Locationsource.USER_SUPPLIED,
                    district=payload.city,
                    state=payload.state,
                    pincode=payload.pincode
                )
                db.add(geo_event)

        # 4. Network Nodes & Edges
        target_node_id = str(uuid.uuid4())
        victim_node_id = str(uuid.uuid4())
        added_entities = set()
        
        if phone and phone != "unknown":
            db.add(NetworkNodes(
                id=target_node_id,
                entityType=Nodetype.PHONE_NUMBER,
                entityValue=phone,
                reportId=threat_id,
                label="Scammer Phone"
            ))
            added_entities.add(phone)

        submitter_name = getattr(user, "name", None) or "Anonymous"
        submitter_phone = getattr(user, "phone", None) or ""
        victim_label = f"{submitter_name} [{submitter_phone}]" if submitter_phone else submitter_name
        victim_value = getattr(user, "id", None) or ip_hash or str(uuid.uuid4())
        
        db.add(NetworkNodes(
            id=victim_node_id,
            entityType=Nodetype.VICTIM,
            entityValue=victim_value,
            reportId=threat_id,
            label=victim_label
        ))
        
        if phone and phone != "unknown":
            db.add(NetworkEdges(
                id=str(uuid.uuid4()),
                sourceNodeId=victim_node_id,
                targetNodeId=target_node_id,
                reportId=threat_id,
                weight=1.0
            ))
            
        entity_type_map = {
            "IN_PHONE": Nodetype.PHONE_NUMBER,
            "IN_BANK_ACCOUNT": Nodetype.BANK_ACCOUNT,
            "UPI_ID": Nodetype.UPI_ID,
            "WEBSITE": Nodetype.WEBSITE,
            "EMAIL_ADDRESS": Nodetype.EMAIL,
            "TELEGRAM_ID": Nodetype.TELEGRAM_ID,
            "CRYPTO_WALLET": Nodetype.CRYPTO_WALLET,
            "IN_IFSC_CODE": Nodetype.IFSC_CODE
        }

        extracted_entities = out.get("extracted_scammer_entities", [])
        
        # Merge IFSC code into Bank Account if both exist
        bank_accounts = [e for e in extracted_entities if e.get("type") == "IN_BANK_ACCOUNT"]
        ifsc_codes = [e for e in extracted_entities if e.get("type") == "IN_IFSC_CODE"]
        if bank_accounts and ifsc_codes:
            bank_val = bank_accounts[0].get("value")
            ifsc_val = ifsc_codes[0].get("value")
            bank_accounts[0]["value"] = f"{bank_val} (IFSC: {ifsc_val})"
            # Filter out IFSC codes so they aren't created as separate nodes
            extracted_entities = [e for e in extracted_entities if e.get("type") != "IN_IFSC_CODE"]
        for ent in extracted_entities:
            raw_type = ent.get("type")
            val = ent.get("value")
            if not val or raw_type not in entity_type_map:
                continue
                
            node_type = entity_type_map[raw_type]
            
            # Use original value as label instead of Extracted to look better
            display_label = f"{val} ({victim_label})"
            
            ent_metadata = ent.get("metadata")
            
            if val not in added_entities:
                ent_node_id = str(uuid.uuid4())
                db.add(NetworkNodes(
                    id=ent_node_id,
                    entityType=node_type,
                    entityValue=val,
                    reportId=threat_id,
                    label=display_label,
                    details=ent_metadata
                ))
                added_entities.add(val)
                
                # Connect entity to the target phone if it exists, else directly to victim
                parent_node_id = target_node_id if (phone and phone != "unknown") else victim_node_id
                
                db.add(NetworkEdges(
                    id=str(uuid.uuid4()),
                    sourceNodeId=parent_node_id,
                    targetNodeId=ent_node_id,
                    reportId=threat_id,
                    weight=1.0
                ))
        
        await db.commit()
        
        # 5. Broadcast Event
        broadcast_payload = {
            "event": "NEW_REPORT",
            "id": threat_id,
            "type": out.get("fraudType") or "Unknown Fraud Type",
            "severity": out.get("severity", "NONE").lower(),
            "verdict": out.get("verdict", "INSUFFICIENT_EVIDENCE"),
            "confidence": out.get("confidenceScore", 0),
            "phone": phone,
            "timestamp": datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        }
        if lat and lng:
            broadcast_payload["lat"] = lat
            broadcast_payload["lng"] = lng
            
        # Invalidate graph cache since new data (report/nodes/edges) is added
        graph_cache.invalidate("network_data")
        
        # Broadcast
        try:
            await ws_manager.broadcast(broadcast_payload)
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")
            
        return threat_id

    async def post_submission_tasks(self, threat_id: str, analysis: dict):
        try:
            # 1. Generate PDF Report in background
            from app.services.pdf_service import pdf_service
            # pdf_service.generate_report_pdf should be updated if it needs async execution
            
            # 2. Check if we should notify Telegram channel (e.g. if critical)
            severity = analysis.get("severity", "NONE").upper()
            if severity in ["CRITICAL", "HIGH"]:
                from app.api.v1.telegram import bot
                from app.core.config import settings
                if bot and getattr(settings, 'TELEGRAM_CHANNEL_ID', None):
                    try:
                        msg = f"🚨 *{severity} THREAT DETECTED* 🚨\n\nType: {analysis.get('fraudType')}\nReport ID: {threat_id}"
                        await bot.send_message(chat_id=settings.TELEGRAM_CHANNEL_ID, text=msg, parse_mode="Markdown")
                    except Exception as e:
                        logger.error(f"Failed to send Telegram notification: {e}")
        except Exception as e:
            logger.error(f"Error in post_submission_tasks: {e}")

intel_service = IntelService()
