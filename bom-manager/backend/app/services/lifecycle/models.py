from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LifecycleData(BaseModel):
    manufacturer: str
    manufacturer_part_number: str
    
    lifecycle_status: Optional[str] = None
    product_status: Optional[str] = None
    
    is_obsolete: Optional[bool] = None
    is_discontinued: Optional[bool] = None
    
    end_of_life_date: Optional[datetime] = None
    availability_status: Optional[str] = None
    
    source: str
    retrieved_at: datetime
