from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import os
import uuid

from app.database import get_db
from app.models.models import Document, PCN, Part
from app.schemas.pcn import DocumentOut, PCNOut, PCNCreate
from app.api.v1.deps import get_current_user
from app.config import settings

router = APIRouter()

@router.post("/parts/{part_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_part_document(
    part_id: str,
    document_type: str = Form(...),
    title: str = Form(...),
    url: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Attach a datasheet, compliance document, or other file to a part catalog record (R-06)."""
    # Check if part exists
    part_result = await db.execute(select(Part).where(Part.id == part_id))
    part = part_result.scalars().first()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")

    saved_path = "online_url"
    if file:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1]
        saved_filename = f"doc_{file_id}{ext}"
        saved_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
        
        file_bytes = await file.read()
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

    db_doc = Document(
        part_id=part_id,
        document_type=document_type,
        title=title,
        file_path=saved_path,
        url=url
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    return db_doc

@router.get("/parts/{part_id}/documents", response_model=List[DocumentOut])
async def list_part_documents(
    part_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve datasheets and certs attached to a part (R-06)."""
    result = await db.execute(select(Document).where(Document.part_id == part_id))
    return result.scalars().all()

@router.post("/pcn", response_model=PCNOut, status_code=status.HTTP_201_CREATED)
async def create_pcn(
    pcn_in: PCNCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Publish a new Product Change Notice (PCN) or EOL alert for a part (R-08)."""
    # Check if part exists
    part_result = await db.execute(select(Part).where(Part.id == pcn_in.part_id))
    if not part_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")

    db_pcn = PCN(
        part_id=pcn_in.part_id,
        pcn_number=pcn_in.pcn_number,
        change_type=pcn_in.change_type,
        description=pcn_in.description,
        effective_date=pcn_in.effective_date,
        document_link=pcn_in.document_link
    )
    db.add(db_pcn)
    await db.commit()
    await db.refresh(db_pcn)
    return db_pcn

@router.get("/pcn", response_model=List[PCNOut])
async def list_pcns(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve history of PCN records."""
    result = await db.execute(select(PCN).order_by(PCN.created_at.desc()))
    return result.scalars().all()
