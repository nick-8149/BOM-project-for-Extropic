from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.database import get_db
from app.models.models import Alert, AlertStatus, AlertType, AlertSeverity, User, AuditLog
from app.api.v1.deps import get_current_user, get_current_active_admin
from app.services.alert_engine import AlertEngine
import json

router = APIRouter()

@router.post("/run")
async def run_alert_engine(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually triggers the Alert Engine to re-evaluate all rules.
    """
    engine = AlertEngine(db)
    result = await engine.run_all_evaluations()
    
    # Audit logging
    log = AuditLog(
        user_id=current_user.id,
        action="Run Alert Engine",
        entity_type="System",
        new_values=result
    )
    db.add(log)
    await db.commit()
    
    return result

@router.get("/")
async def get_alerts(
    status: Optional[str] = None,
    type: Optional[str] = None,
    severity: Optional[str] = None,
    is_read: Optional[bool] = None,
    part_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves alerts with optional filtering.
    """
    query = select(Alert).order_by(
        # Custom ordering to float CRITICAL to the top, then HIGH, then order by date
        # In SQLite, we can just order by severity DESC since C, H, W, I works out mostly, 
        # actually alphabetical is C, H, I, W. Let's just order by date for now, and filter on frontend.
        Alert.created_at.desc()
    )
    
    if status:
        query = query.where(Alert.status == status)
    else:
        # Default to non-dismissed, non-resolved
        query = query.where(Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]))
        
    if type:
        query = query.where(Alert.alert_type == type)
    if severity:
        query = query.where(Alert.severity == severity)
    if is_read is not None:
        query = query.where(Alert.is_read == is_read)
    if part_id:
        query = query.where(Alert.part_id == part_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()
    
    # Let's return them manually serialized since we don't have a Pydantic schema file for alerts yet
    # Or we can just return the SQLAlchemy objects directly since FastAPI handles basic serialization if they are dicts
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "part_id": a.part_id,
            "bom_id": a.bom_id,
            "pcn_id": a.pcn_id,
            "risk_score": a.risk_score,
            "status": a.status,
            "is_read": a.is_read,
            "created_at": a.created_at,
            "updated_at": a.updated_at,
            "resolved_at": a.resolved_at,
            "metadata": a.metadata_json
        } for a in alerts
    ]

@router.get("/unread")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gets the count of unread, active alerts.
    """
    query = select(func.count(Alert.id)).where(
        Alert.is_read == False,
        Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED])
    )
    result = await db.execute(query)
    count = result.scalar() or 0
    return {"unread_count": count}

@router.post("/{alert_id}/read")
async def mark_read(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    await db.commit()
    return {"status": "success"}

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.is_read = True
    
    # Audit log
    log = AuditLog(user_id=current_user.id, action="Acknowledge Alert", entity_type="Alert", entity_id=alert.id)
    db.add(log)
    
    await db.commit()
    return {"status": "success", "alert_status": alert.status}

@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    from datetime import datetime
    alert.status = AlertStatus.RESOLVED
    alert.is_read = True
    alert.resolved_at = datetime.utcnow()
    
    # Audit log
    log = AuditLog(user_id=current_user.id, action="Resolve Alert", entity_type="Alert", entity_id=alert.id)
    db.add(log)
    
    await db.commit()
    return {"status": "success", "alert_status": alert.status}

@router.post("/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = AlertStatus.DISMISSED
    alert.is_read = True
    
    log = AuditLog(user_id=current_user.id, action="Dismiss Alert", entity_type="Alert", entity_id=alert.id)
    db.add(log)
    
    await db.commit()
    return {"status": "success", "alert_status": alert.status}
