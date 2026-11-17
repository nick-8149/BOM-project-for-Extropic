from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PartNumberMappingBase(BaseModel):
    internal_part_number: str
    manufacturer_id: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    mapping_source: Optional[str] = None
    notes: Optional[str] = None

class PartNumberMappingCreate(PartNumberMappingBase):
    pass

class PartNumberMappingUpdate(BaseModel):
    manufacturer_id: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    mapping_source: Optional[str] = None
    notes: Optional[str] = None
    # NOTE: verification_status is explicitly excluded here. It must go through the dedicated verify endpoint.

class PartNumberMappingOut(PartNumberMappingBase):
    id: str
    mapping_confidence: float
    verification_status: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PartNumberMappingVerify(BaseModel):
    # This payload is for the verification endpoint
    verification_status: str # VERIFIED or REJECTED
