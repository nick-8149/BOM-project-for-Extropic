from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.models import BOM, BOMItem
from app.schemas.bom import BOMOut, BOMItemOut, BOMItemUpdate
from app.services.bom_processor import process_bom_upload
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.post("/upload", response_model=BOMOut, status_code=status.HTTP_201_CREATED)
async def upload_bom(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload Excel/CSV BOM file and trigger validation/parsing pipeline (R-11)."""
    file_bytes = await file.read()
    bom = await process_bom_upload(
        file_bytes=file_bytes,
        filename=file.filename,
        user_id=current_user.id,
        db=db
    )
    return bom

@router.get("", response_model=List[BOMOut])
async def list_boms(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve history of uploaded BOMs."""
    result = await db.execute(
        select(BOM)
        .where(BOM.uploaded_by == current_user.id)
        .order_by(BOM.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/{bom_id}", response_model=BOMOut)
async def get_bom(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get single BOM header details."""
    result = await db.execute(select(BOM).where(BOM.id == bom_id))
    bom = result.scalars().first()
    if not bom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM not found")
    return bom

@router.get("/{bom_id}/items", response_model=List[BOMItemOut])
async def list_bom_items(
    bom_id: str,
    skip: int = 0,
    limit: int = 250,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get rows/items of a parsed BOM."""
    result = await db.execute(
        select(BOMItem)
        .where(BOMItem.bom_id == bom_id)
        .order_by(BOMItem.serial_number.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.put("/{bom_id}/items/{item_id}", response_model=BOMItemOut)
async def update_bom_item(
    bom_id: str,
    item_id: str,
    item_in: BOMItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update details of a BOM item (Action Taken workflow)."""
    result = await db.execute(
        select(BOMItem).where(BOMItem.id == item_id, BOMItem.bom_id == bom_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM Item not found")
        
    item.action_taken = item_in.action_taken
    item.notes = item_in.notes
    
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{bom_id}/process", response_model=BOMOut)
async def process_bom_matching(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Trigger the matching engine on all items of a BOM (R-01)."""
    from app.services.matcher import find_match
    from datetime import datetime

    result = await db.execute(select(BOM).where(BOM.id == bom_id))
    bom = result.scalars().first()
    if not bom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM not found")

    items_result = await db.execute(
        select(BOMItem).where(BOMItem.bom_id == bom_id)
    )
    items = items_result.scalars().all()

    matched = 0
    unmatched = 0
    review = 0

    for item in items:
        matched_id, confidence, status_val = await find_match(
            item.original_part_number,
            item.original_manufacturer or "",
            db
        )
        item.matched_part_id = matched_id
        item.confidence_score = confidence
        item.validation_status = status_val
        item.processed_at = datetime.utcnow()

        if status_val == "Matched":
            matched += 1
        elif status_val == "Unmatched":
            unmatched += 1
        else:
            review += 1
            
        # Trigger risk scoring for item
        from app.services.risk_engine import calculate_bom_item_risk
        await calculate_bom_item_risk(item, db)

    bom.matched_items = matched
    bom.unmatched_items = unmatched
    bom.review_items = review
    bom.status = "Completed"
    bom.processed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(bom)
    return bom

