"""
AI Smart Replacement Service — Main orchestration.

Coordinates:
1. Loading the original part with full relationships
2. Retrieving candidate parts from the database
3. Serializing data for the AI prompt (only real data, never fabricated)
4. Calling the AI provider for structured analysis
5. Validating the AI response with Pydantic
6. Returning a clean, validated response
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.models import (
    Part, PartManufacturer, PartSupplier, LifecycleInfo,
    ComplianceInfo, RiskAssessment, ReplacementCandidate
)
from app.services.ai.providers import get_ai_provider, AIProviderError
from app.services.ai.schemas import (
    AIAnalysisResponse, AICandidateAnalysis, AICompatibilityDetail,
    OriginalPartContext, CandidatePartContext, AIExplainResponse
)
from app.services.ai.prompts import build_analysis_prompt, build_explanation_prompt
from app.services.replacement_engine import find_ai_candidates

logger = logging.getLogger(__name__)


def _serialize_part_context(
    part: Part,
    risk: Optional[RiskAssessment] = None,
    description_similarity: float = 0.0,
) -> dict:
    """Serialize a Part ORM object into a plain dict for AI prompt context.
    Only includes data that actually exists — never fabricates values."""

    manufacturers = []
    if part.manufacturers:
        for pm in part.manufacturers:
            if pm.manufacturer:
                manufacturers.append(pm.manufacturer.name)

    suppliers = []
    if part.suppliers:
        for ps in part.suppliers:
            if ps.supplier:
                suppliers.append({
                    "name": ps.supplier.name,
                    "is_approved": ps.is_approved,
                    "is_authorized": ps.supplier.is_authorized,
                    "status": ps.supplier.status,
                })

    lifecycle_status = None
    eol_date = None
    years_to_eol = None
    if part.lifecycle_info:
        lifecycle_status = part.lifecycle_info.lifecycle_status
        eol_date = str(part.lifecycle_info.eol_date) if part.lifecycle_info.eol_date else None
        years_to_eol = part.lifecycle_info.years_to_eol

    rohs_status = None
    if part.compliance_info:
        rohs_status = part.compliance_info.rohs_status

    risk_level = None
    risk_score = None
    if risk:
        risk_level = risk.risk_level
        risk_score = risk.overall_risk_score

    return {
        "part_id": part.id,
        "part_number": part.part_number,
        "description": part.description,
        "category": part.category,
        "package_type": part.package_type,
        "standard_cert": part.standard_cert,
        "manufacturers": manufacturers,
        "suppliers": suppliers,
        "lifecycle_status": lifecycle_status,
        "eol_date": eol_date,
        "years_to_eol": years_to_eol,
        "rohs_status": rohs_status,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "description_similarity": description_similarity,
    }


async def _load_part_with_relations(part_id: str, db: AsyncSession) -> Optional[Part]:
    """Load a part with all its relationships for AI context."""
    result = await db.execute(
        select(Part)
        .options(
            selectinload(Part.manufacturers).selectinload(PartManufacturer.manufacturer),
            selectinload(Part.suppliers).selectinload(PartSupplier.supplier),
            selectinload(Part.lifecycle_info),
            selectinload(Part.compliance_info),
            selectinload(Part.risk_assessments),
        )
        .where(Part.id == part_id)
    )
    return result.scalars().first()


async def _get_part_risk(part_id: str, db: AsyncSession) -> Optional[RiskAssessment]:
    """Get the latest risk assessment for a part."""
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.part_id == part_id)
        .order_by(RiskAssessment.assessed_at.desc())
    )
    return result.scalars().first()


async def analyze_replacement(
    part_id: str,
    replacement_goal: str,
    db: AsyncSession,
) -> dict:
    """
    Main AI analysis orchestration.

    1. Load original part
    2. Find candidates from DB
    3. Serialize context
    4. Call AI
    5. Validate response
    6. Return structured result
    """

    # 1. Load original part
    original_part = await _load_part_with_relations(part_id, db)
    if not original_part:
        return {
            "error": True,
            "message": "Part not found.",
            "original_part": None,
            "analysis": None,
        }

    original_risk = await _get_part_risk(part_id, db)
    original_context = _serialize_part_context(original_part, original_risk)

    # 2. Find candidates from database
    candidates_raw = await find_ai_candidates(part_id, db)
    if not candidates_raw:
        return {
            "error": False,
            "message": "No candidate components found matching the original part's specifications.",
            "original_part": original_context,
            "analysis": AIAnalysisResponse(
                summary="No replacement candidates were found in the database matching the original component's category and specifications.",
                warnings=["No candidates available for analysis."],
                missing_data=["Additional parts in the same category need to be added to the database."],
                validation_required=[],
                reasoning="The database does not contain any parts in the same category that could serve as replacements.",
            ).model_dump(),
        }

    # 3. Serialize candidate contexts
    candidate_contexts = []
    for c in candidates_raw:
        candidate_part = await _load_part_with_relations(c["replacement_part_id"], db)
        if candidate_part:
            candidate_risk = await _get_part_risk(c["replacement_part_id"], db)
            ctx = _serialize_part_context(
                candidate_part,
                candidate_risk,
                description_similarity=c.get("confidence_score", 0.0),
            )
            candidate_contexts.append(ctx)

    if not candidate_contexts:
        return {
            "error": False,
            "message": "Candidates found but could not load their full data.",
            "original_part": original_context,
            "analysis": None,
        }

    # 4. Call AI provider
    try:
        provider = get_ai_provider()
        prompt = build_analysis_prompt(original_context, candidate_contexts, replacement_goal)
        raw_response = await provider.generate_structured(prompt)
    except AIProviderError as e:
        logger.error(f"AI analysis failed: {e}")
        return {
            "error": True,
            "message": f"AI analysis is currently unavailable: {str(e)}. You can still review existing replacement candidates.",
            "original_part": original_context,
            "analysis": None,
        }

    # 5. Validate response with Pydantic
    try:
        analysis = AIAnalysisResponse.model_validate(raw_response)
    except Exception as e:
        logger.error(f"AI response validation failed: {e}")
        # Try to return partial data if possible
        return {
            "error": True,
            "message": f"AI returned a malformed response. Raw analysis may be unreliable.",
            "original_part": original_context,
            "analysis": raw_response,  # Return raw for debugging
        }

    # 6. Persist AI analysis results as ReplacementCandidate records
    for ai_candidate in analysis.candidates:
        await _persist_ai_candidate(
            original_part_id=part_id,
            ai_candidate=ai_candidate,
            analysis=analysis,
            model_name=f"{settings.AI_PROVIDER}/{settings.AI_MODEL}",
            db=db,
        )

    return {
        "error": False,
        "message": "AI analysis completed successfully.",
        "original_part": original_context,
        "analysis": analysis.model_dump(),
    }


async def _persist_ai_candidate(
    original_part_id: str,
    ai_candidate: AICandidateAnalysis,
    analysis: AIAnalysisResponse,
    model_name: str,
    db: AsyncSession,
):
    """Persist or update AI analysis as a ReplacementCandidate record."""
    from app.config import settings as app_settings

    # Check if a record already exists for this pair
    result = await db.execute(
        select(ReplacementCandidate).where(
            ReplacementCandidate.original_part_id == original_part_id,
            ReplacementCandidate.replacement_part_id == ai_candidate.part_id,
        )
    )
    existing = result.scalars().first()

    if existing:
        # Update existing record with new AI analysis
        existing.ai_score = ai_candidate.compatibility_score
        existing.ai_confidence = ai_candidate.confidence
        existing.ai_summary = analysis.summary
        existing.ai_reasoning = ai_candidate.reasoning
        existing.ai_warnings = ai_candidate.warnings
        existing.ai_missing_data = analysis.missing_data
        existing.ai_validation_required = analysis.validation_required
        existing.ai_compatibility = {
            k: v.model_dump() for k, v in ai_candidate.compatibility.items()
        }
        existing.analysis_model = model_name
        existing.analysis_timestamp = datetime.utcnow()
        if not existing.action_taken or existing.action_taken == "Suggested":
            existing.reason = ai_candidate.reasoning
            existing.confidence_score = ai_candidate.compatibility_score
    else:
        # Create new record
        new_candidate = ReplacementCandidate(
            original_part_id=original_part_id,
            replacement_part_id=ai_candidate.part_id,
            reason=ai_candidate.reasoning,
            confidence_score=ai_candidate.compatibility_score,
            ai_score=ai_candidate.compatibility_score,
            ai_confidence=ai_candidate.confidence,
            ai_summary=analysis.summary,
            ai_reasoning=ai_candidate.reasoning,
            ai_warnings=ai_candidate.warnings,
            ai_missing_data=analysis.missing_data,
            ai_validation_required=analysis.validation_required,
            ai_compatibility={
                k: v.model_dump() for k, v in ai_candidate.compatibility.items()
            },
            analysis_model=model_name,
            analysis_timestamp=datetime.utcnow(),
            action_taken="Suggested",
        )
        db.add(new_candidate)

    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to persist AI candidate: {e}")
        await db.rollback()


async def explain_replacement(
    part_id: str,
    question: str,
    analysis_context: Optional[str],
    db: AsyncSession,
) -> dict:
    """
    AI explanation chat — answer questions about a replacement analysis.
    Uses the same part/candidate data to ground the response.
    """

    # Load original part
    original_part = await _load_part_with_relations(part_id, db)
    if not original_part:
        return {"answer": "Part not found.", "sources": []}

    original_risk = await _get_part_risk(part_id, db)
    original_context = _serialize_part_context(original_part, original_risk)

    # Load existing AI-analyzed candidates for this part
    result = await db.execute(
        select(ReplacementCandidate)
        .options(
            selectinload(ReplacementCandidate.replacement_part),
        )
        .where(ReplacementCandidate.original_part_id == part_id)
        .order_by(ReplacementCandidate.ai_score.desc().nullslast())
    )
    candidates = result.scalars().all()

    candidates_data = []
    for c in candidates:
        candidates_data.append({
            "part_number": c.replacement_part.part_number if c.replacement_part else "Unknown",
            "description": c.replacement_part.description if c.replacement_part else None,
            "ai_score": c.ai_score,
            "ai_confidence": c.ai_confidence,
            "action_taken": c.action_taken,
        })

    # Build the explanation prompt
    try:
        provider = get_ai_provider()
        prompt = build_explanation_prompt(
            original=original_context,
            candidates=candidates_data,
            analysis_summary=analysis_context or "No previous analysis summary available.",
            question=question,
        )
        answer = await provider.generate_text(prompt)
    except AIProviderError as e:
        return {
            "answer": f"AI explanation is currently unavailable: {str(e)}",
            "sources": [],
        }

    sources = [f"Part: {original_part.part_number}"]
    for c in candidates_data:
        sources.append(f"Candidate: {c['part_number']}")

    return {
        "answer": answer,
        "sources": sources,
    }
