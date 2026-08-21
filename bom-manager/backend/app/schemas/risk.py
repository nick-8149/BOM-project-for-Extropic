from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RiskAssessmentOut(BaseModel):
    id: str
    part_id: Optional[str] = None
    bom_item_id: Optional[str] = None
    overall_risk_score: float
    risk_level: str
    lifecycle_risk: float
    eol_risk: float
    supplier_risk: float
    compliance_risk: float
    match_confidence_risk: float
    notes: Optional[str] = None
    assessed_at: datetime

    class Config:
        from_attributes = True

class ReplacementCandidateOut(BaseModel):
    id: str
    original_part_id: str
    replacement_part_id: str
    replacement_part_number: str
    replacement_description: Optional[str] = None
    replacement_manufacturer: Optional[str] = None
    reason: Optional[str] = None
    confidence_score: float
    replacement_notes: Optional[str] = None
    action_taken: Optional[str] = None

    class Config:
        from_attributes = True
