from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.models import Manufacturer
from app.schemas.manufacturer import ManufacturerOut, ManufacturerCreate
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[ManufacturerOut])
async def list_manufacturers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Manufacturer).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("", response_model=ManufacturerOut, status_code=status.HTTP_201_CREATED)
async def create_manufacturer(
    mfr_in: ManufacturerCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    existing = await db.execute(select(Manufacturer).where(Manufacturer.name == mfr_in.name))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manufacturer with this name already exists."
        )
    
    db_mfr = Manufacturer(**mfr_in.model_dump())
    db.add(db_mfr)
    await db.commit()
    await db.refresh(db_mfr)
    return db_mfr
