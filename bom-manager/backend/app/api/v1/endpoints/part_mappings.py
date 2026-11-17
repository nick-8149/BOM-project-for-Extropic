from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.models import PartNumberMapping, User
from app.schemas.part_mapping import PartNumberMappingCreate, PartNumberMappingOut, PartNumberMappingUpdate, PartNumberMappingVerify
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[PartNumberMappingOut])
async def get_mappings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PartNumberMapping))
    return result.scalars().all()

@router.get("/{id}", response_model=PartNumberMappingOut)
async def get_mapping(id: str, db: AsyncSession = Depends(get_db)):
    mapping = await db.get(PartNumberMapping, id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping

@router.post("/", response_model=PartNumberMappingOut, status_code=status.HTTP_201_CREATED)
async def create_mapping(mapping_in: PartNumberMappingCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if IPN already exists
    existing = await db.execute(select(PartNumberMapping).where(PartNumberMapping.internal_part_number == mapping_in.internal_part_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mapping for this internal part number already exists")

    new_mapping = PartNumberMapping(
        internal_part_number=mapping_in.internal_part_number,
        manufacturer_id=mapping_in.manufacturer_id,
        manufacturer_part_number=mapping_in.manufacturer_part_number,
        mapping_source=mapping_in.mapping_source,
        notes=mapping_in.notes,
        verification_status="DRAFT" # Explicitly force to DRAFT on creation
    )
    
    db.add(new_mapping)
    await db.commit()
    await db.refresh(new_mapping)
    return new_mapping

@router.put("/{id}", response_model=PartNumberMappingOut)
async def update_mapping(id: str, mapping_in: PartNumberMappingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    mapping = await db.get(PartNumberMapping, id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = mapping_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mapping, field, value)
        
    # If the core mapping data changes, revert verification status to DRAFT
    if "manufacturer_part_number" in update_data or "manufacturer_id" in update_data:
        mapping.verification_status = "DRAFT"
        mapping.verified_by = None
        mapping.verified_at = None

    await db.commit()
    await db.refresh(mapping)
    return mapping

@router.post("/{id}/verify", response_model=PartNumberMappingOut)
async def verify_mapping(id: str, verify_in: PartNumberMappingVerify, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Dedicated endpoint for an authorized user to verify or reject a mapping."""
    mapping = await db.get(PartNumberMapping, id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    status = verify_in.verification_status.upper()
    if status not in ("VERIFIED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Invalid verification status. Must be VERIFIED or REJECTED")

    if status == "VERIFIED":
        if not mapping.manufacturer_part_number or not mapping.manufacturer_id:
            raise HTTPException(status_code=400, detail="Cannot verify mapping: missing manufacturer or manufacturer part number")

    mapping.verification_status = status
    mapping.verified_by = current_user.id
    mapping.verified_at = datetime.utcnow()

    await db.commit()
    await db.refresh(mapping)
    return mapping

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    mapping = await db.get(PartNumberMapping, id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
        
    await db.delete(mapping)
    await db.commit()
