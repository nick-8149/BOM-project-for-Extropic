from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class DocumentCreate(BaseModel):
    part_id: str
    document_type: str # Datasheet, Compliance, PCN
    title: str
    url: Optional[str] = None

class DocumentOut(BaseModel):
    id: str
    part_id: str
    document_type: str
    title: str
    file_path: str
    url: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class PCNCreate(BaseModel):
    part_id: str
    pcn_number: str
    change_type: str # End of Life, Materials change, site change
    description: Optional[str] = None
    effective_date: date
    document_link: Optional[str] = None

class PCNOut(BaseModel):
    id: str
    part_id: str
    pcn_number: str
    change_type: str
    description: Optional[str] = None
    effective_date: date
    status: str
    document_link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
