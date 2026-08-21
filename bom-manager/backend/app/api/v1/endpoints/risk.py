from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.models import RiskAssessment, ReplacementCandidate, BOMItem
from app.schemas.risk import RiskAssessmentOut, ReplacementCandidateOut
from app.services.replacement_engine import find_replacement_candidates
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("/bom-item/{item_id}", response_model=RiskAssessmentOut)
async def get_item_risk(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve risk breakdown score for a particular BOM line item (R-13)."""
    result = await db.execute(
        select(RiskAssessment).where(RiskAssessment.bom_item_id == item_id)
    )
    assessment = result.scalars().first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk assessment report not found for this item."
        )
    return assessment

@router.get("/replacements/{part_id}", response_model=List[ReplacementCandidateOut])
async def list_replacements(
    part_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Find pin-compatible, RoHS-compliant alternatives for a part (R-05)."""
    candidates = await find_replacement_candidates(part_id, db)
    
    # Map raw candidates dict to schemas
    results = []
    for c in candidates:
        results.append(ReplacementCandidateOut(
            id=f"rep-{c['replacement_part_id']}",
            original_part_id=part_id,
            replacement_part_id=c["replacement_part_id"],
            replacement_part_number=c["replacement_part_number"],
            replacement_description=c["replacement_description"],
            replacement_manufacturer=c["replacement_manufacturer"],
            reason=c["reason"],
            confidence_score=c["confidence_score"],
            action_taken="Suggested"
        ))
    return results
