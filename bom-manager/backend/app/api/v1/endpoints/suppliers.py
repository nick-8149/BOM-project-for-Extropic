from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.models import Supplier
from app.schemas.supplier import SupplierOut, SupplierCreate
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[SupplierOut])
async def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Supplier).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_in: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    existing = await db.execute(select(Supplier).where(Supplier.name == supplier_in.name))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier with this name already exists."
        )
    
    db_supplier = Supplier(**supplier_in.model_dump())
    db.add(db_supplier)
    await db.commit()
    await db.refresh(db_supplier)
    return db_supplier
