from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SupplierBase(BaseModel):
    name: str
    code: Optional[str] = None
    location: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    status: str = "Active"
    is_authorized: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
