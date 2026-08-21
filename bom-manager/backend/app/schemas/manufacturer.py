from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ManufacturerBase(BaseModel):
    name: str
    code: Optional[str] = None
    country_of_origin: Optional[str] = None
    website: Optional[str] = None

class ManufacturerCreate(ManufacturerBase):
    pass

class ManufacturerOut(ManufacturerBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
