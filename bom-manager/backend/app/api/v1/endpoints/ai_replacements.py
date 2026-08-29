from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.models import ReplacementCandidate
from app.services.ai.schemas import AIAnalyzeRequest, AIExplainRequest, AIExplainResponse, AIReviewRequest, AIReviewResponse
from app.services.ai.replacement_service import analyze_replacement, explain_replacement

router = APIRouter()

@router.post("/ai-analyze/{part_id}")
async def run_ai_analysis(
    part_id: str,
    request: AIAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Trigger AI analysis for a specific part.
    This fetches candidates, sends real data to the AI, and persists the structured result.
    """
    result = await analyze_replacement(
        part_id=part_id,
        replacement_goal=request.replacement_goal,
        db=db
    )
    
    if result["error"]:
        # We might still have partial data, so we don't throw an HTTP error unless it's a hard fail
        pass
        
    return result


@router.post("/ai-explain", response_model=AIExplainResponse)
async def run_ai_explanation(
    request: AIExplainRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Ask the AI a specific question about the replacement analysis.
    Grounds the response in the actual part and candidate data.
    """
    result = await explain_replacement(
        part_id=request.part_id,
        question=request.question,
        analysis_context=request.analysis_context,
        db=db
    )
    return result


@router.post("/ai-review/{candidate_id}", response_model=AIReviewResponse)
async def submit_ai_review(
    candidate_id: str,
    request: AIReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Human-in-the-loop: Submit an engineering review decision for an AI candidate.
    """
    # Fetch the candidate
    result = await db.execute(
        select(ReplacementCandidate).where(ReplacementCandidate.id == candidate_id)
    )
    candidate = result.scalars().first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Replacement candidate not found."
        )
        
    # Map API choices to DB action strings
    action_map = {
        "approved": "Accept",
        "rejected": "Reject",
        "needs_testing": "Manual Review",
    }
    
    candidate.action_taken = action_map.get(request.decision, request.decision)
    candidate.review_comments = request.comments
    candidate.reviewed_by = current_user.id
    candidate.review_timestamp = datetime.utcnow()
    
    await db.commit()
    await db.refresh(candidate)
    
    return candidate
