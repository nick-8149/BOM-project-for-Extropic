from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import os
import uuid

from app.models.models import BOM, BOMItem
from app.services.bom_parser import parse_and_validate_bom
from app.services.bom_normalizer import normalize_part_number, normalize_manufacturer_name
from app.config import settings

async def process_bom_upload(
    file_bytes: bytes,
    filename: str,
    user_id: str,
    db: AsyncSession
) -> BOM:
    """
    Main processing pipeline:
    1. Parse and extract records + validation metrics.
    2. Write files to secure path.
    3. Store BOM headers and BOMItems.
    """
    # 1. Parse data
    records, summary = parse_and_validate_bom(file_bytes, filename)
    
    # 2. Save file locally
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1]
    saved_filename = f"{file_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 3. Create BOM db record
    db_bom = BOM(
        uploaded_by=user_id,
        name=os.path.splitext(filename)[0],
        filename=filename,
        file_path=file_path,
        status="Pending",
        total_items=len(records),
        matched_items=0,
        unmatched_items=0,
        review_items=0
    )
    db.add(db_bom)
    await db.flush() # Populate db_bom.id

    # 4. Insert BOM Items
    for record in records:
        # Normalize fields for later matching stages
        norm_pn = normalize_part_number(record["original_part_number"])
        norm_mfr = normalize_manufacturer_name(record["original_manufacturer"])
        
        db_item = BOMItem(
            bom_id=db_bom.id,
            serial_number=record["serial_number"],
            original_part_number=record["original_part_number"],
            original_manufacturer=record["original_manufacturer"],
            original_supplier=record["original_supplier"],
            original_description=record["original_description"],
            quantity=record["quantity"],
            validation_status="Unmatched" # Will be updated during match phase
        )
        db.add(db_item)
        
    await db.commit()
    await db.refresh(db_bom)
    
    # Note: We will chain matching and risk pipeline in Phase 5
    return db_bom
