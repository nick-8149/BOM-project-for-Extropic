from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.schemas.manufacturer import ManufacturerOut
from app.schemas.supplier import SupplierOut

class PartManufacturerBase(BaseModel):
    manufacturer_id: str
    manufacturer_part_number: str
    is_primary: bool = True

class PartManufacturerOut(BaseModel):
    id: str
    manufacturer: ManufacturerOut
    manufacturer_part_number: str
    is_primary: bool

    class Config:
        from_attributes = True

class PartSupplierBase(BaseModel):
    supplier_id: str
    supplier_part_number: str
    is_approved: bool = True

class PartSupplierOut(BaseModel):
    id: str
    supplier: SupplierOut
    supplier_part_number: str
    is_approved: bool

    class Config:
        from_attributes = True

class LifecycleInfoOut(BaseModel):
    lifecycle_status: str
    eol_date: Optional[date] = None
    years_to_eol: Optional[float] = None
    last_verified: date
    source: Optional[str] = None

    class Config:
        from_attributes = True

class ComplianceInfoOut(BaseModel):
    rohs_status: str
    rohs_directive_ref: Optional[str] = None
    certificate_link: Optional[str] = None

    class Config:
        from_attributes = True

class PartBase(BaseModel):
    part_number: str
    description: Optional[str] = None
    category: Optional[str] = None
    package_type: Optional[str] = None
    standard_cert: Optional[str] = None
    notes: Optional[str] = None

class PartCreate(PartBase):
    pass

class PartOut(PartBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PartDetailOut(PartOut):
    manufacturers: List[PartManufacturerOut] = []
    suppliers: List[PartSupplierOut] = []
    lifecycle_info: Optional[LifecycleInfoOut] = None
    compliance_info: Optional[ComplianceInfoOut] = None
