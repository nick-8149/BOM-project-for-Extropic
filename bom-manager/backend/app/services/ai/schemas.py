"""
Pydantic schemas for validating AI-generated replacement analysis responses.

All AI output is validated through these models to ensure structured,
predictable data. The AI must never return arbitrary free-text — it must
conform to these schemas or the response is rejected.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class AICompatibilityDetail(BaseModel):
    """Compatibility assessment for a single attribute dimension."""
    status: Literal["match", "partial_match", "incompatible", "unknown"] = "unknown"
    explanation: str = "Insufficient data to determine compatibility."


class AICandidateAnalysis(BaseModel):
    """AI analysis result for a single replacement candidate."""
    part_id: str
    part_number: str
    manufacturer: Optional[str] = None
    compatibility_score: float = Field(
        ge=0, le=100,
        description="AI Compatibility Estimate (0-100). NOT a guaranteed engineering score."
    )
    confidence: Literal["high", "medium", "low"] = "low"
    compatibility: dict[str, AICompatibilityDetail] = Field(
        default_factory=dict,
        description="Compatibility breakdown by dimension (category, package, lifecycle, compliance, supplier)"
    )
    strengths: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    reasoning: str = ""


class AIAnalysisResponse(BaseModel):
    """Complete structured AI analysis for a replacement recommendation."""
    summary: str = ""
    recommended_candidate: Optional[str] = None
    confidence: Literal["high", "medium", "low"] = "low"
    candidates: list[AICandidateAnalysis] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    missing_data: list[str] = Field(default_factory=list)
    validation_required: list[str] = Field(default_factory=list)
    reasoning: str = ""


class AIExplainRequest(BaseModel):
    """Request body for the AI explanation chat endpoint."""
    part_id: str
    question: str = Field(min_length=1, max_length=1000)
    analysis_context: Optional[str] = None


class AIExplainResponse(BaseModel):
    """Response from the AI explanation chat."""
    answer: str
    sources: list[str] = Field(default_factory=list)


class AIAnalyzeRequest(BaseModel):
    """Request body for triggering AI analysis."""
    replacement_goal: Literal[
        "eol", "compliance", "cost_reduction", "risk_mitigation"
    ] = "eol"


class AIReviewRequest(BaseModel):
    """Request body for human review of an AI recommendation."""
    decision: Literal["approved", "rejected", "needs_testing"]
    comments: str = ""


class AIReviewResponse(BaseModel):
    """Response after submitting a review decision."""
    id: str
    original_part_id: str
    replacement_part_id: str
    ai_score: Optional[float] = None
    ai_confidence: Optional[str] = None
    action_taken: str
    review_comments: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class OriginalPartContext(BaseModel):
    """Serialized context of the original part sent to the AI."""
    part_id: str
    part_number: str
    description: Optional[str] = None
    category: Optional[str] = None
    package_type: Optional[str] = None
    standard_cert: Optional[str] = None
    manufacturers: list[str] = Field(default_factory=list)
    suppliers: list[dict] = Field(default_factory=list)
    lifecycle_status: Optional[str] = None
    eol_date: Optional[str] = None
    years_to_eol: Optional[float] = None
    rohs_status: Optional[str] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None


class CandidatePartContext(BaseModel):
    """Serialized context of a candidate part sent to the AI."""
    part_id: str
    part_number: str
    description: Optional[str] = None
    category: Optional[str] = None
    package_type: Optional[str] = None
    standard_cert: Optional[str] = None
    manufacturers: list[str] = Field(default_factory=list)
    suppliers: list[dict] = Field(default_factory=list)
    lifecycle_status: Optional[str] = None
    eol_date: Optional[str] = None
    years_to_eol: Optional[float] = None
    rohs_status: Optional[str] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    description_similarity: float = 0.0
