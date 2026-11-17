from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.lifecycle import PartIdentityLifecycle
from app.models.models import PartNumberMapping
from app.services.lifecycle.service import LifecycleService
from app.services.lifecycle.registry import provider_registry
from app.services.identity.resolver import IdentityResolver

router = APIRouter()

def get_lifecycle_service() -> LifecycleService:
    provider = provider_registry.get_default_provider()
    return LifecycleService(provider=provider, identity_resolver=IdentityResolver())

# Backward compatibility reference
_lifecycle_service = get_lifecycle_service()

@router.get("/provider/info")
async def get_provider_info(current_user = Depends(get_current_user)):
    """
    Returns active lifecycle provider diagnostics and configuration status.
    """
    from app.config import settings
    active = getattr(settings, "LIFECYCLE_PROVIDER", "mock")
    nexar_configured = bool(settings.NEXAR_CLIENT_ID and settings.NEXAR_CLIENT_SECRET)
    return {
        "active_provider": active,
        "is_nexar_active": active.lower() == "nexar",
        "nexar_configured": nexar_configured,
        "available_providers": provider_registry.list_known_providers()
    }

@router.get("/{internal_part_number}")
async def get_lifecycle(
    internal_part_number: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve lifecycle data and lookup status for a given internal part number.
    """
    result = await db.execute(
        select(PartIdentityLifecycle).where(PartIdentityLifecycle.internal_part_number == internal_part_number)
    )
    record = result.scalars().first()
    
    if not record:
        mapping_result = await db.execute(
            select(PartNumberMapping).where(PartNumberMapping.internal_part_number == internal_part_number)
        )
        mapping = mapping_result.scalars().first()
        if mapping and mapping.verification_status == "VERIFIED":
            return {
                "internal_part_number": internal_part_number,
                "manufacturer": "Unknown",
                "manufacturer_part_number": mapping.manufacturer_part_number or internal_part_number,
                "lookup_status": "NOT_AVAILABLE",
                "lifecycle": None,
                "reason": "Real Nexar lifecycle data is unavailable for this verified identity.",
                "source": "nexar",
                "retrieved_at": datetime.utcnow(),
                "match_type": "EXACT_MATCH",
                "verification_status": "VERIFIED"
            }
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lifecycle data not found for this part number")

    lifecycle_data = None
    if record.lookup_status == "SUCCESS":
        lifecycle_data = {
            "lifecycle_status": record.lifecycle_status,
            "product_status": record.product_status,
            "is_obsolete": record.is_obsolete,
            "is_discontinued": record.is_discontinued,
            "end_of_life_date": record.end_of_life_date,
            "availability_status": record.availability_status
        }
        
    return {
        "internal_part_number": record.internal_part_number,
        "manufacturer": record.manufacturer,
        "manufacturer_part_number": record.manufacturer_part_number,
        "lookup_status": record.lookup_status,
        "lifecycle": lifecycle_data,
        "reason": record.error_reason,
        "source": record.provider,
        "retrieved_at": record.retrieved_at,
        "match_type": record.match_type,
        "verification_status": record.verification_status
    }


@router.post("/batch/{bom_id}")
async def process_batch_lifecycle(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    lifecycle_service: LifecycleService = Depends(get_lifecycle_service)
):
    """
    Triggers batch lifecycle processing for all distinct items in a BOM.
    Returns detailed diagnostics on database hits, blocked identities,
    mock results, and actual Nexar requests.
    """
    try:
        summary = await lifecycle_service.process_bom_lifecycle(bom_id, db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
