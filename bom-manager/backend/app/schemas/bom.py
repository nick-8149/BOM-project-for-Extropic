from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BOMItemBase(BaseModel):
    serial_number: Optional[int] = None
    original_part_number: str
    original_manufacturer: Optional[str] = None
    original_supplier: Optional[str] = None
    original_description: Optional[str] = None
    quantity: float = 1.0

class BOMItemCreate(BOMItemBase):
    pass

class BOMItemOut(BOMItemBase):
    id: str
    bom_id: str
    validation_status: str
    confidence_score: float
    matched_part_id: Optional[str] = None
    suggested_part_number: Optional[str] = None
    suggested_supplier: Optional[str] = None
    action_taken: Optional[str] = None
    notes: Optional[str] = None
    processed_at: datetime

    class Config:
        from_attributes = True

class BOMBase(BaseModel):
    name: str

class BOMCreate(BOMBase):
    pass

class BOMOut(BOMBase):
    id: str
    uploaded_by: Optional[str] = None
    filename: str
    status: str
    total_items: int
    matched_items: int
    unmatched_items: int
    review_items: int
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BOMItemUpdate(BaseModel):
    action_taken: str # Accept / Edit / Create Draft / Flag / Reject
    notes: Optional[str] = None
