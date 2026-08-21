from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.models import Part, PartManufacturer, PartSupplier, LifecycleInfo, ComplianceInfo
from app.schemas.part import PartOut, PartDetailOut, PartCreate
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[PartOut])
async def list_parts(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve list of parts with pagination."""
    result = await db.execute(select(Part).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/search", response_model=List[PartOut])
async def search_parts(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search parts by MPN (Part Number) or description (R-10)."""
    # Simple search: exact match or contains substring case-insensitive
    # SQLITE uses LIKE for case-insensitive matches by default
    query = select(Part).where(
        Part.part_number.ilike(f"%{q}%") | Part.description.ilike(f"%{q}%")
    ).limit(50)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{part_id}", response_model=PartDetailOut)
async def get_part(
    part_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get full details of a part, including related tables (R-03)."""
    result = await db.execute(
        select(Part)
        .options(
            selectinload(Part.manufacturers).selectinload(PartManufacturer.manufacturer),
            selectinload(Part.suppliers).selectinload(PartSupplier.supplier),
            selectinload(Part.lifecycle_info),
            selectinload(Part.compliance_info)
        )
        .where(Part.id == part_id)
    )
    part = result.scalars().first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    return part

@router.post("", response_model=PartOut, status_code=status.HTTP_201_CREATED)
async def create_part(
    part_in: PartCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new part record."""
    # Check if MPN already exists
    existing = await db.execute(select(Part).where(Part.part_number == part_in.part_number))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Part with this part number already exists."
        )
    
    db_part = Part(**part_in.model_dump())
    db.add(db_part)
    await db.commit()
    await db.refresh(db_part)
    return db_part
