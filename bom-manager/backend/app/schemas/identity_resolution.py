from pydantic import BaseModel
from typing import Literal, List, Optional
from datetime import datetime

class IdentityResolutionSummary(BaseModel):
    total_rows: int
    total_mpns: int
    total_ipns: int
    resolved: int
    requires_mpn_mapping: int
    ambiguous: int
    missing_data: int
    requires_manufacturer_review: int

class ManufacturerCandidate(BaseModel):
    raw: str
    canonical: Optional[str]
    status: Literal["CONFIRMED_ALIAS", "POSSIBLE_ALIAS", "DISTINCT"]

class IdentityResolutionRecord(BaseModel):
    id: str
    internal_part_number: Optional[str]
    manufacturer_raw: Optional[str]
    manufacturers: List[ManufacturerCandidate]
    
    part_classification: Literal["IPN", "MPN", "UNKNOWN"]
    manufacturer_part_number: Optional[str]
    
    resolution_status: Literal[
        "RESOLVED",
        "REQUIRES_MPN_MAPPING",
        "AMBIGUOUS",
        "MISSING_DATA",
        "REQUIRES_MANUFACTURER_REVIEW"
    ]
    
    verification_status: Optional[Literal["DRAFT", "VERIFIED", "REJECTED"]]
    mapping_id: Optional[str]
    
    lifecycle_lookup_allowed: bool
    lifecycle_block_reason: Optional[str]

class IdentityResolutionListResponse(BaseModel):
    items: List[IdentityResolutionRecord]
    total: int
    page: int
    page_size: int
    has_next: bool
