from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, BackgroundTasks, UploadFile, File, Form
import base64
from app.api.deps import require_admin, require_analyst_or_above, get_current_user, rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
import hashlib
import uuid
import time
from datetime import datetime, timedelta, UTC
import asyncio
from typing import Any, Optional
from app.models.domain import Severity, Verdict

from app.database.session import get_db
from app.repositories.threat import threat_repo
from app.schemas.threat import SubmitPayload, StreamFeedResponse, ThreatStreamResponse
from pydantic import BaseModel
class UpdateReportPayload(BaseModel):
    officer_note: Optional[dict] = None
    evidence: Optional[dict] = None
    audit: Optional[dict] = None
from app.models.domain import ThreatReports, PhoneReputations, Channel, NetworkNodes, NetworkEdges, Nodetype, StateFinancialImpact, GeoEvents, Locationsource, CityCoordinates, Users
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from app.api.v1.geo import _STATE_COORDS
from app.services.network_service import network_service
from app.services.ai_pipeline import ai_pipeline
from app.services.intel_service import intel_service
from app.services.pdf_service import pdf_service
from app.core.websocket_manager import manager as ws_manager
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from app.core.cache import graph_cache

def _cache_get() -> Optional[dict]:
    return graph_cache.get("network_data")

def _cache_set(data: dict):
    graph_cache.set("network_data", data)

def _cache_invalidate():
    graph_cache.invalidate("network_data")

def severity_to_score(sev: str) -> float:
    mapping = {"CRITICAL": 95, "HIGH": 75, "MEDIUM": 50, "LOW": 20}
    return mapping.get(sev.upper(), 0.0)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live intelligence feed."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client can send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)

@router.get("/stream", response_model=StreamFeedResponse)
async def get_intel_stream(db: AsyncSession = Depends(get_db), cursor: Optional[str] = None, limit: int = 50):
    reports = await threat_repo.get_recent_stream(db, limit=limit, cursor=cursor)
    feed = []
    for r in reports:
        feed.append({
            "id": r.id,
            "type": r.fraudType or "Unknown Fraud Type",
            "module": "AI_ANALYSIS",
            "confidence": r.confidenceScore,
            "severity": r.severity.value.lower() if r.severity else "unknown",
            "timestamp": r.createdAt.isoformat() + "Z",
            "description": f"Phone: {r.targetPhoneNumber} — Verdict: {r.verdict.value}"
        })
    return {"feed": feed, "total": len(feed)}

@router.get("/reports", dependencies=[Depends(require_analyst_or_above)])
async def get_all_reports(db: AsyncSession = Depends(get_db), cursor: Optional[str] = None, limit: int = 100):
    reports = await threat_repo.get_recent_stream(db, limit=limit, cursor=cursor)
    
    user_ids = [r.createdByUserId for r in reports if r.createdByUserId]
    user_map = {}
    if user_ids:
        users_result = await db.execute(select(Users).filter(Users.id.in_(user_ids)))
        user_map = {u.id: u.name for u in users_result.scalars().all()}

    report_ids = [r.id for r in reports]
    state_map = {}
    if report_ids:
        geo_res = await db.execute(select(GeoEvents).filter(GeoEvents.reportId.in_(report_ids)))
        for g in geo_res.scalars().all():
            if g.state:
                state_map[g.reportId] = g.state

    return [{
        "id": r.id,
        "targetPhoneNumber": r.targetPhoneNumber,
        "fraudType": r.fraudType,
        "verdict": r.verdict.value if r.verdict else "UNKNOWN",
        "severity": r.severity.value if r.severity else "UNKNOWN",
        "createdAt": r.createdAt.isoformat() + "Z",
        "confidenceScore": r.confidenceScore,
        "reporterName": user_map.get(r.createdByUserId, "Citizen"),
        "state": state_map.get(r.id),
        "financialExposure": getattr(r, "financialExposure", None)
    } for r in reports]

@router.get("/reports/{report_id}", dependencies=[Depends(require_analyst_or_above)])
async def get_report_detail(report_id: str, db: AsyncSession = Depends(get_db)):
    report = await threat_repo.get(db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    nodes_result = await db.execute(
        select(NetworkNodes).filter(NetworkNodes.reportId == report_id)
    )
    nodes = nodes_result.scalars().all()
    entities = [n.entityValue for n in nodes if (n.entityType.value if hasattr(n.entityType, "value") else str(n.entityType)) != 'VICTIM']
        
    return {
        "id": report.id,
        "targetPhoneNumber": report.targetPhoneNumber,
        "payloadText": report.payloadText,
        "verdict": report.verdict.value if report.verdict else "UNKNOWN",
        "severity": report.severity.value if report.severity else "UNKNOWN",
        "confidenceScore": report.confidenceScore,
        "fraudType": report.fraudType,
        "analysisOutput": {
            "reasoning": report.reasoning,
            "tags": report.tags,
            "timeline": report.timelineSteps,
            "scammerEntities": entities
        },
        "createdAt": report.createdAt.isoformat() + "Z",
    }

@router.post("/media/upload", dependencies=[Depends(rate_limit)])
async def upload_media(
    file: UploadFile = File(...),
    phoneNumber: Optional[str] = Form(None),
    req: Request = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    contents = await file.read()
    content_type = file.content_type
    
    extracted_text = ""
    if content_type.startswith("audio/"):
        extracted_text = await ai_pipeline.transcribe_audio(contents, file.filename)
    elif content_type.startswith("image/"):
        b64 = base64.b64encode(contents).decode("utf-8")
        extracted_text = await ai_pipeline.extract_text_from_image(b64)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
        
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from media")
        
    payload = SubmitPayload(
        text=extracted_text,
        phoneNumber=phoneNumber,
        analysisResult=None
    )
    
    result = await submit_intel(payload, req, background_tasks, db, current_user)
    if isinstance(result, dict):
        result["id"] = result.get("threatReportId")
        result["analysisOutput"] = result.get("analysis")
        result["extractedText"] = extracted_text
    return result

@router.post("/submit", dependencies=[Depends(rate_limit)])
async def submit_intel(
    payload: SubmitPayload, 
    req: Request, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Invalidate graph cache since new data is being submitted
    _cache_invalidate()
    if not payload.analysisResult:
        # If no analysis result provided, run it through our AI pipeline
        payload.analysisResult = await ai_pipeline.analyze_fraud(payload.text, payload.phoneNumber)
        
    ip = req.client.host if req.client else "unknown"
    out = payload.analysisResult
    
    phone = payload.phoneNumber or "unknown"
    text = payload.text or ""
    
    hash_str = f"{phone}:{text}"
    payload_hash = hashlib.sha256(hash_str.encode()).hexdigest()
    
    try:
        threat_id = await intel_service.process_submission(payload, current_user, ip, db)
        
        # Add background tasks
        background_tasks.add_task(intel_service.post_submission_tasks, threat_id, payload.analysisResult)
        
        return {"success": True, "threatReportId": threat_id, "analysis": out}
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to submit report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit report: {str(e)}")

@router.get("/network", dependencies=[Depends(require_admin)])
async def get_network(db: AsyncSession = Depends(get_db), layout: str = "force"):
    # Serve from cache if fresh (TTL = 60s)
    cached = _cache_get()
    if cached is not None:
        logger.debug("Serving /network from cache")
        return cached

    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    thirty_days_ago_naive = thirty_days_ago.replace(tzinfo=None)
    nodes_db = await db.execute(select(NetworkNodes).where(NetworkNodes.createdAt >= thirty_days_ago_naive))
    edges_db = await db.execute(select(NetworkEdges).where(NetworkEdges.createdAt >= thirty_days_ago_naive))
    
    db_nodes = nodes_db.scalars().all()
    
    report_victims = {}
    for n in db_nodes:
        n_type = getattr(n.entityType, "value", str(n.entityType)).replace("Nodetype.", "")
        if n_type == "VICTIM":
            report_victims[n.reportId] = n.label

    merged_nodes = {}
    id_mapping = {}
    
    for n in db_nodes:
        n_type = getattr(n.entityType, "value", str(n.entityType)).replace("Nodetype.", "")
        key = (n_type, n.entityValue)
        victim_name = report_victims.get(n.reportId)
        
        if key not in merged_nodes:
            merged_nodes[key] = {
                "id": n.id,
                "label": n.label,
                "data": {
                    "type": n_type,
                    "value": n.entityValue,
                    "createdAt": n.createdAt.isoformat() if n.createdAt else None,
                    "reports": 1,
                    "reportedBy": [victim_name] if victim_name else [],
                    "metadata": getattr(n, "details", None)
                }
            }
        else:
            merged_nodes[key]["data"]["reports"] += 1
            if victim_name and victim_name not in merged_nodes[key]["data"]["reportedBy"]:
                merged_nodes[key]["data"]["reportedBy"].append(victim_name)
                
        id_mapping[n.id] = merged_nodes[key]["id"]
        
    phones = [k[1] for k in merged_nodes.keys() if k[0] == "PHONE_NUMBER"]
    phone_reps = {}
    if phones:
        reps_result = await db.execute(select(PhoneReputations).filter(PhoneReputations.phoneNumber.in_(phones)))
        phone_reps = {p.phoneNumber: p for p in reps_result.scalars().all()}
        
    for key, node in merged_nodes.items():
        if key[0] == "PHONE_NUMBER" and key[1] in phone_reps:
            node["data"]["reports"] = phone_reps[key[1]].reportCount
            
    node_list = list(merged_nodes.values())
    
    edge_list = []
    for e in edges_db.scalars().all():
        src = id_mapping.get(e.sourceNodeId)
        tgt = id_mapping.get(e.targetNodeId)
        if src and tgt and src != tgt:
            edge_list.append({"source": src, "target": tgt, "data": {"weight": e.weight}})

    
    if not node_list:
        return {"nodes": [], "edges": [], "total": 0, "stats": {}}
        
    result = await asyncio.to_thread(network_service.analyze_graph, node_list, edge_list, layout)
    
    react_nodes = []
    
    # Calculate some stats for the top bar
    total_victims = 0
    total_kingpins = 0
    fraud_rings = len([n for n in result["nodes"] if n.get("type") == "CLUSTER"])
    critical_rings = 0
    
    victim_counter = 0
    
    for i, n in enumerate(result["nodes"]):
        is_kingpin = n.get("is_kingpin", False)
        n_label = n.get("label")
        n_type = str(n.get("type", "")).upper()
        
        # Determine react-flow node type based on entity type
        if is_kingpin:
            react_flow_type = "kingpin"
            total_kingpins += 1
        elif n_type == "CLUSTER":
            react_flow_type = "cluster"
            if n.get("count", 0) > 5:
                critical_rings += 1
            total_victims += n.get("count", 0)
        else:
            # Map DB types to frontend components
            if n_type == "PHONE_NUMBER": react_flow_type = "phone"
            elif n_type == "UPI_ID": react_flow_type = "upi"
            elif n_type == "BANK_ACCOUNT": react_flow_type = "bank"
            elif n_type == "TELEGRAM_ID" or n_type == "TELEGRAM_USERNAME": react_flow_type = "telegram"
            elif n_type == "CRYPTO_WALLET": react_flow_type = "crypto"
            elif n_type == "WEBSITE" or n_type == "SCAM_WEBSITE": react_flow_type = "website"
            elif n_type == "EMAIL": react_flow_type = "email"
            elif n_type == "VICTIM" or n_label == "VICTIM": 
                react_flow_type = "victim"
                total_victims += 1
            else:
                react_flow_type = "entity" # Fallback
                
        # Format label (remove UUIDs)
        display_label = n_label
        if n_type == "CLUSTER":
            if n_label == "VICTIM_CLUSTER":
                display_label = "Targeted Victims"
            else:
                display_label = "Fraud Ring"
        elif n_type == "VICTIM" or n_label == "VICTIM":
            if n_label and n_label != "VICTIM":
                display_label = f"{n_label} [VICTIM]"
            else:
                victim_counter += 1
                display_label = f"Victim #{victim_counter}"
        else:
            display_label = str(n.get("value", display_label))
            
        pos = n.get("position", {"x": 0, "y": 0})
            
        base_pagerank = n.get("pagerank", 0) * 100
        reports_count = n.get("reports", 1)
        connections_count = n.get("in_degree", 0) + n.get("out_degree", 0)
        
        report_score = min(60, reports_count * 20)
        conn_score = min(40, connections_count * 10)
        
        risk_score = min(99.0, base_pagerank + report_score + conn_score)
        
        if risk_score >= 80:
            risk_level = "CRITICAL"
        elif risk_score >= 60:
            risk_level = "HIGH"
        elif risk_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        if n_type == "VICTIM" or "VICTIM" in str(n_label).upper():
            risk_level = "NONE"
            risk_score = 0.0
        elif n_type == "PHONE_NUMBER" and n.get("value") in phone_reps:
            rep = phone_reps[n.get("value")]
            risk_level = rep.dominantSeverity.value if hasattr(rep.dominantSeverity, "value") else str(rep.dominantSeverity)
            risk_score = float(rep.aggregatedRiskScore)

        if is_kingpin:
            risk_level = "CRITICAL"
            if risk_score < 95:
                risk_score = 95.0 + (risk_score / 20)  # Boost to 95-100 range
            
        if n_type == "CLUSTER":
            if risk_level not in ("CRITICAL", "HIGH"):
                risk_level = "HIGH"
            if risk_score < 75:
                risk_score = 75.0 + (risk_score / 4) # Boost to 75-100 range
        
        # Round it off for display
        risk_score = round(risk_score, 1)

        react_nodes.append({
            "id": n["id"],
            "type": react_flow_type,
            "position": pos,
            "data": {
                "id": n["id"],
                "label": display_label,
                "value": n.get("value", display_label),
                "isKingpin": is_kingpin,
                "count": n.get("count", 0),
                "riskLevel": risk_level,
                "riskScore": risk_score,
                "reports": n.get("reports", 1),
                "reportedBy": n.get("reportedBy", []),
                "connections": n.get("in_degree", 0) + n.get("out_degree", 0),
                "firstSeen": n.get("createdAt"),
                "lastSeen": n.get("createdAt"),
                "entityType": n_type,
                "metadata": n.get("metadata"),
                "hidden_nodes": n.get("hidden_nodes"),
                "hidden_edges": n.get("hidden_edges")
            }
        })
        
    react_edges = []
    
    # Infer relationship labels based on connected node types
    node_type_map = {n["id"]: n["data"].get("entityType", "") for n in react_nodes}
    # Set of kingpin node IDs — edges touching these will be animated
    kingpin_ids = {n["id"] for n in react_nodes if n["data"].get("isKingpin", False)}
    
    from collections import defaultdict
    # Extract all edges, including hidden edges inside clusters, so we can count phone victim connections accurately
    all_edges_to_process = list(result["edges"])
    hidden_edges_map = {} # Maps cluster_id -> list of processed hidden edges
    
    for n in react_nodes:
        if n["data"].get("entityType") == "CLUSTER" and n["data"].get("hidden_edges"):
            for he in n["data"]["hidden_edges"]:
                all_edges_to_process.append(he)
    
    phone_victim_counts = defaultdict(int)
    for e in all_edges_to_process:
        src_type = node_type_map.get(e["source"], "")
        tgt_type = node_type_map.get(e["target"], "")
        # Also handle raw types if they were hidden nodes
        if not src_type:
            # try to find in hidden_nodes
            for n in react_nodes:
                if n["data"].get("hidden_nodes"):
                    for hn in n["data"]["hidden_nodes"]:
                        if hn["id"] == e["source"]:
                            src_type = str(hn.get("type", "")).upper()
        if not tgt_type:
            for n in react_nodes:
                if n["data"].get("hidden_nodes"):
                    for hn in n["data"]["hidden_nodes"]:
                        if hn["id"] == e["target"]:
                            tgt_type = str(hn.get("type", "")).upper()
                            
        # In hidden nodes, type might just be 'VICTIM' or 'NODETYPE.VICTIM'
        is_src_victim = "VICTIM" in src_type
        is_tgt_victim = "VICTIM" in tgt_type
        
        if is_src_victim and "PHONE" in tgt_type:
            phone_victim_counts[e["target"]] += 1
        elif "PHONE" in src_type and is_tgt_victim:
            phone_victim_counts[e["source"]] += 1

    for i, e in enumerate(result["edges"]):
        src_type = node_type_map.get(e["source"], "")
        tgt_type = node_type_map.get(e["target"], "")
        
        edge_label = "Connected"
        edge_color = "#3f3f46"
        
        is_src_victim = "VICTIM" in src_type
        is_tgt_victim = "VICTIM" in tgt_type
        
        if src_type == "PHONE_NUMBER" and tgt_type == "PHONE_NUMBER":
            edge_label = "Called"
            edge_color = "#6366f1"
        elif src_type == "BANK_ACCOUNT" and tgt_type == "BANK_ACCOUNT":
            edge_label = "Transferred Money"
            edge_color = "#10b981"
        elif "UPI" in src_type and "UPI" in tgt_type:
            edge_label = "Transferred Money"
            edge_color = "#10b981"
        elif is_src_victim and "PHONE" in tgt_type:
            edge_label = "Received Call"
            edge_color = "#ffffff" if phone_victim_counts[e["target"]] > 1 else "#ef4444"
        elif "PHONE" in src_type and is_tgt_victim:
            edge_label = "Received Call"
            edge_color = "#ffffff" if phone_victim_counts[e["source"]] > 1 else "#ef4444"
        elif tgt_type == "CLUSTER":
            edge_label = "Part of Ring"
            
        # Only animate edges directly connected to a kingpin node
        is_hot = e.get("source") in kingpin_ids or e.get("target") in kingpin_ids
        react_edges.append({
            "id": f"edge-{i}",
            "source": e["source"],
            "target": e["target"],
            "animated": is_hot,
            "label": edge_label,
            "style": {"stroke": edge_color, "strokeWidth": 2},
            "labelStyle": {"fill": "#a1a1aa", "fontSize": 10, "fontFamily": "monospace"},
            "labelBgStyle": {"fill": "#18181b", "color": "#18181b", "fillOpacity": 0.8}
        })

    # Now assign colors to hidden_edges
    for n in react_nodes:
        if n["data"].get("entityType") == "CLUSTER" and n["data"].get("hidden_edges"):
            for he in n["data"]["hidden_edges"]:
                # Default for hidden edges
                he_src_type = ""
                he_tgt_type = ""
                for hn in n["data"]["hidden_nodes"]:
                    if hn["id"] == he["source"]: he_src_type = str(hn.get("type", "")).upper()
                    if hn["id"] == he["target"]: he_tgt_type = str(hn.get("type", "")).upper()
                
                # fallback to map if not in hidden_nodes (e.g. connected to an external phone)
                if not he_src_type: he_src_type = node_type_map.get(he["source"], "")
                if not he_tgt_type: he_tgt_type = node_type_map.get(he["target"], "")
                
                is_he_src_victim = "VICTIM" in he_src_type
                is_he_tgt_victim = "VICTIM" in he_tgt_type
                
                if is_he_src_victim and "PHONE" in he_tgt_type:
                    he["label"] = "Received Call"
                    he["style"] = {"stroke": "#ffffff" if phone_victim_counts[he["target"]] > 1 else "#ef4444", "strokeWidth": 2}
                elif "PHONE" in he_src_type and is_he_tgt_victim:
                    he["label"] = "Received Call"
                    he["style"] = {"stroke": "#ffffff" if phone_victim_counts[he["source"]] > 1 else "#ef4444", "strokeWidth": 2}
                else:
                    he["label"] = "Connected"
                    he["style"] = {"stroke": "#3f3f46", "strokeWidth": 2}
        
    # Count actual threat reports
    reports_count = await db.execute(select(func.count(ThreatReports.id)))
    actual_total_reports = reports_count.scalar() or 0

    # Count victims directly from NetworkNodes table, but distinct by user/entityValue
    victims_count = await db.execute(
        select(func.count(func.distinct(NetworkNodes.entityValue))).where(NetworkNodes.entityType == "VICTIM")
    )
    actual_total_victims = victims_count.scalar() or 0

    # Count scammer phone numbers (unique)
    scammer_phones_count = await db.execute(
        select(func.count(func.distinct(PhoneReputations.phoneNumber)))
    )
    actual_scammer_phones = scammer_phones_count.scalar() or 0

    # Sum total amount reported from StateFinancialImpact (real DB data)
    amount_result = await db.execute(select(func.sum(StateFinancialImpact.amountReported)))
    total_amount_reported = amount_result.scalar() or 0

    stats = {
        "totalReports": actual_total_reports,
        "totalVictims": actual_total_victims,
        "fraudRings": fraud_rings,
        "criticalRings": critical_rings,
        "kingpins": total_kingpins,
        "scammerNumbers": actual_scammer_phones,
        "totalAmountReported": total_amount_reported,
    }
        
    response = {"nodes": react_nodes, "edges": react_edges, "total": len(react_nodes), "stats": stats}
    _cache_set(response)
    return response

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_reports = await db.scalar(select(func.count()).select_from(ThreatReports))
    total_blocked = await db.scalar(select(func.count()).select_from(PhoneReputations).where(PhoneReputations.aggregatedRiskScore > 75))
    
    return {
        "scamsPrevented": total_reports or 0,
        "muleClusters": 0,
        "highRiskNumbers": total_blocked or 0,
    }

@router.get("/phone/{number}")
async def get_phone_reputation(number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PhoneReputations).where(PhoneReputations.phoneNumber == number))
    rep = result.scalars().first()
    if not rep:
        return {"status": "NO_DATA"}
    return {
        "status": "DATA_FOUND",
        "phoneNumber": rep.phoneNumber,
        "aggregatedRiskScore": rep.aggregatedRiskScore,
        "dominantSeverity": rep.dominantSeverity.value if hasattr(rep.dominantSeverity, "value") else str(rep.dominantSeverity) if rep.dominantSeverity else "NONE",
        "dominantFraudType": rep.dominantFraudType,
        "reportCount": rep.reportCount,
        "lastReportedAt": rep.lastReportedAt.isoformat() + "Z" if rep.lastReportedAt else None
    }

@router.get("/phone/{number}/reports")
async def get_phone_reports(number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ThreatReports)
        .where(ThreatReports.targetPhoneNumber == number)
        .order_by(ThreatReports.createdAt.desc())
        .limit(10)
    )
    reports = result.scalars().all()
    res = []
    for r in reports:
        res.append({
            "id": r.id,
            "fraudType": r.fraudType,
            "severity": r.severity.value if hasattr(r.severity, "value") else str(r.severity) if r.severity else "NONE",
            "verdict": r.verdict.value if hasattr(r.verdict, "value") else str(r.verdict) if r.verdict else "UNKNOWN",
            "createdAt": r.createdAt.isoformat() + "Z" if r.createdAt else None
        })
    return {"reports": res}

@router.get("/reports")
async def get_reports(db: AsyncSession = Depends(get_db)):
    reports = await threat_repo.get_multi(db, limit=100)
    res = []
    for r in reports:
        d = r.__dict__.copy()
        d.pop("_sa_instance_state", None)
        # convert enums and dates
        for k, v in d.items():
            if hasattr(v, "value"):
                d[k] = v.value
            elif hasattr(v, "isoformat"):
                d[k] = v.isoformat()
        res.append(d)
    return res

@router.get("/export/incident/{id}")
async def export_incident(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ThreatReports)
        .options(selectinload(ThreatReports.users))
        .where(ThreatReports.id == id)
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    nodes_result = await db.execute(
        select(NetworkNodes).where(NetworkNodes.reportId == id, NetworkNodes.entityType != Nodetype.VICTIM)
    )
    nodes = nodes_result.scalars().all()
    
    extracted = []
    for n in nodes:
        extracted.append({
            "type": n.entityType.value if hasattr(n.entityType, "value") else str(n.entityType).replace("Nodetype.", ""),
            "value": n.entityValue,
            "score": "High"
        })
        
    analysis_data = {
        "verdict": report.verdict.value if report.verdict else "UNKNOWN",
        "severity": report.severity.value if report.severity else "UNKNOWN",
        "confidenceScore": report.confidenceScore,
        "fraudType": report.fraudType,
        "timeline": report.timelineSteps,
        "reasoning": report.reasoning,
        "payloadText": report.payloadText,
        "reportedBy": {
            "name": report.users.name if report.users and report.users.name else "Anonymous",
            "phone": report.users.phone if report.users and report.users.phone else "Unknown"
        },
        "extracted_scammer_entities": extracted
    }
    pdf_bytes = pdf_service.generate_report_pdf(report.id, analysis_data)
    
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=incident_{id}.pdf"})

from app.models.domain import GeoEvents
from sqlalchemy.orm import selectinload

@router.get("/geospatial")
async def get_geospatial(db: AsyncSession = Depends(get_db)):
    events_result = await db.execute(select(GeoEvents).options(selectinload(GeoEvents.threat_reports)).limit(500))
    events = events_result.scalars().all()
    
    out = []
    for e in events:
        out.append({
            "id": e.id,
            "lat": e.lat,
            "lng": e.lng,
            "district": e.district,
            "severity": e.severity.value if e.severity else "NONE",
            "fraudType": e.threat_reports.fraudType if e.threat_reports and e.threat_reports.fraudType else "Unknown",
            "phoneNumber": e.threat_reports.targetPhoneNumber if e.threat_reports else "Unknown",
            "createdAt": e.createdAt.isoformat() + "Z" if e.createdAt else ""
        })
    return {"events": out}
@router.get("/unverified")
async def get_unverified(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ThreatReports).where(ThreatReports.verdict == "INSUFFICIENT_EVIDENCE").limit(50))
    reports = result.scalars().all()
    res = []
    for r in reports:
        d = r.__dict__.copy()
        d.pop("_sa_instance_state", None)
        for k, v in d.items():
            if hasattr(v, "value"):
                d[k] = v.value
            elif hasattr(v, "isoformat"):
                d[k] = v.isoformat()
        res.append(d)
    return res

@router.get("/entity/{id}/summary")
async def get_entity_summary(id: str, db: AsyncSession = Depends(get_db)):
    node = await db.execute(select(NetworkNodes).where(NetworkNodes.id == id))
    node_data = node.scalars().first()
    
    if not node_data:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    edges_q = await db.execute(select(NetworkEdges).where((NetworkEdges.sourceNodeId == id) | (NetworkEdges.targetNodeId == id)))
    edges = edges_q.scalars().all()
    
    v_count = len([e for e in edges if "victim" in e.sourceNodeId.lower() or "victim" in e.targetNodeId.lower()])
    
    # Fetch all reports associated with this entity value
    reports_q = await db.execute(
        select(ThreatReports)
        .join(NetworkNodes, NetworkNodes.reportId == ThreatReports.id)
        .where(
            NetworkNodes.entityValue == node_data.entityValue,
            NetworkNodes.entityType == node_data.entityType
        )
    )
    linked_reports = reports_q.scalars().unique().all()
    
    total_exposure = sum((getattr(r, "financialExposure", 0) or 0) for r in linked_reports)
    exposure_str = f"₹{total_exposure:,.2f}" if total_exposure > 0 else "Unknown"

    from app.services.ai_pipeline import AIPipelineService
    ai_service = AIPipelineService()
    summary_text = await ai_service.generate_entity_summary(
        entity_type=getattr(node_data.entityType, "value", str(node_data.entityType)).replace("Nodetype.", ""),
        entity_value=node_data.entityValue,
        connections=len(edges),
        reports=max(1, len(edges)-v_count),
        victims=v_count,
        financial_exposure=exposure_str
    )
    if not summary_text or "unavailable" in summary_text.lower():
        summary_text = f"This entity ({node_data.entityValue}) is part of a fraud ring containing {len(edges)} connections. The primary entity appears in {max(1, len(edges)-v_count)} reports. It is directly linked to {v_count} victims. The estimated financial exposure is {exposure_str}.\n\nRecommended actions:\n- Freeze linked accounts\n- Notify banks\n- Request CDR\n- Escalate to I4C"

    
    # For each report, find the victim node
    report_ids = [r.id for r in linked_reports]
    victim_map = {}
    if report_ids:
        from app.models.domain import Nodetype
        victim_nodes_q = await db.execute(
            select(NetworkNodes)
            .where(
                NetworkNodes.reportId.in_(report_ids),
                NetworkNodes.entityType == Nodetype.VICTIM
            )
        )
        victim_nodes = victim_nodes_q.scalars().all()
        victim_map = {n.reportId: n.label for n in victim_nodes}

    reports_data = [{
        "id": r.id,
        "fraudType": r.fraudType,
        "severity": r.severity.value if hasattr(r.severity, "value") else str(r.severity),
        "verdict": r.verdict.value if hasattr(r.verdict, "value") else str(r.verdict),
        "createdAt": r.createdAt.isoformat() + "Z" if r.createdAt else None,
        "targetPhoneNumber": r.targetPhoneNumber,
        "victim": victim_map.get(r.id, "Unknown Victim")
    } for r in linked_reports]
    
    return {
        "summary": summary_text, 
        "entity": {
            "id": node_data.id, 
            "value": node_data.entityValue, 
            "type": node_data.entityType.value if hasattr(node_data.entityType, "value") else str(node_data.entityType)
        },
        "reports": reports_data
    }
@router.patch("/reports/{report_id}", dependencies=[Depends(require_analyst_or_above)])
async def update_report(report_id: str, payload: UpdateReportPayload, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update
    
    report = await threat_repo.get(db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    officer_notes = list(report.officerNotes) if report.officerNotes else []
    evidence_history = list(report.evidenceHistory) if report.evidenceHistory else []
    audit_trail = list(report.auditTrail) if report.auditTrail else []
    
    if payload.officer_note:
        officer_notes.append(payload.officer_note)
    if payload.evidence:
        evidence_history.append(payload.evidence)
    if payload.audit:
        audit_trail.append(payload.audit)
        
    stmt = update(ThreatReports).where(ThreatReports.id == report_id).values(
        officerNotes=officer_notes,
        evidenceHistory=evidence_history,
        auditTrail=audit_trail
    )
    
    await db.execute(stmt)
    await db.commit()
    
    return {"success": True, "message": "Report updated successfully"}
