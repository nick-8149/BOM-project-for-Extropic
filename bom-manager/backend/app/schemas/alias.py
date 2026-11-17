from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AliasCreate(BaseModel):
    requested_manufacturer: str = Field(..., description="Exact requested manufacturer")
    requested_mpn: str = Field(..., description="Exact requested MPN")
    returned_manufacturer: str = Field(..., description="Exact returned manufacturer")
    returned_mpn: str = Field(..., description="Exact returned MPN")
    variant_type: str = Field(..., description="One of: PACKAGING_VARIANT, MANUFACTURER_NORMALIZATION, QUALIFICATION_VARIANT, OTHER_CONTROLLED_VARIANT")
    evidence: str = Field(..., description="Authoritative evidence for the variant")
    verification_status: str = Field(default="DRAFT", description="DRAFT, VERIFIED, REJECTED")

class AliasResponse(BaseModel):
    id: str
    requested_manufacturer: str
    requested_mpn: str
    returned_manufacturer: str
    returned_mpn: str
    variant_type: str
    verification_status: str
    evidence: Optional[str]
    verified_by: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True

class AliasStatusUpdate(BaseModel):
    verification_status: str
    evidence: str

class AliasReviewCandidateResponse(BaseModel):
    id: str
    requested_manufacturer: str
    requested_mpn: str
    returned_manufacturer: str
    returned_mpn: str
    proposed_variant_type: Optional[str] = None
    provider: str
    evidence: str
    review_status: str
    reviewer: Optional[str] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class AliasCandidateConvert(BaseModel):
    action: str # "CONVERT" or "REJECT"
