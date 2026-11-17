from pydantic import BaseModel
from typing import Optional, List

class ResolvedPartIdentity(BaseModel):
    original_part_number: str
    part_number_type: str # MPN, IPN, AMBIGUOUS, MISSING
    
    manufacturer_raw: str
    manufacturer_canonical: Optional[str] = None
    manufacturer_id: Optional[str] = None
    
    # If the original PN was an IPN, this will hold the VERIFIED mapped MPN.
    # If the original PN was an MPN, this is identical to original_part_number.
    manufacturer_part_number: Optional[str] = None 
    
    resolution_status: str # RESOLVED, REQUIRES_MPN_MAPPING, REQUIRES_MANUFACTURER_REVIEW, AMBIGUOUS, MISSING_DATA
    resolution_confidence: float = 0.0
    resolution_source: str # e.g. "Direct", "part_number_mapping_table"
