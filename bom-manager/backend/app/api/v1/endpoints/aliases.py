from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.models import PartNumberAlias, User, AuditLog, AliasReviewCandidate
from app.api.v1.deps import get_current_user
from app.schemas.alias import AliasCreate, AliasResponse, AliasReviewCandidateResponse, AliasCandidateConvert

router = APIRouter()

VALID_VARIANT_TYPES = {
    "PACKAGING_VARIANT",
    "MANUFACTURER_NORMALIZATION",
    "QUALIFICATION_VARIANT",
    "OTHER_CONTROLLED_VARIANT",
}

VALID_STATUSES = {"DRAFT", "VERIFIED", "REJECTED"}

@router.get("/", response_model=List[AliasResponse])
async def list_aliases(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PartNumberAlias))
    return result.scalars().all()

@router.post("/", response_model=AliasResponse)
async def create_alias(alias_in: AliasCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Block qualification variants entirely
    if alias_in.variant_type == "QUALIFICATION_VARIANT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Qualification variants require separate manual engineering review."
        )

    if alias_in.variant_type not in VALID_VARIANT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid variant_type. Must be one of: {', '.join(sorted(VALID_VARIANT_TYPES))}"
        )

    if not alias_in.evidence or len(alias_in.evidence.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit evidence is required to create an alias."
        )

    # Check for duplicates
    existing = await db.execute(
        select(PartNumberAlias).where(
            PartNumberAlias.requested_manufacturer == alias_in.requested_manufacturer,
            PartNumberAlias.requested_mpn == alias_in.requested_mpn,
            PartNumberAlias.returned_manufacturer == alias_in.returned_manufacturer,
            PartNumberAlias.returned_mpn == alias_in.returned_mpn
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This alias relationship already exists."
        )

    # Force new aliases to DRAFT status — never allow direct VERIFIED creation
    db_alias = PartNumberAlias(
        requested_manufacturer=alias_in.requested_manufacturer,
        requested_mpn=alias_in.requested_mpn,
        returned_manufacturer=alias_in.returned_manufacturer,
        returned_mpn=alias_in.returned_mpn,
        variant_type=alias_in.variant_type,
        verification_status="DRAFT",
        evidence=alias_in.evidence,
        verified_by=None
    )

    db.add(db_alias)

    # Audit trail for creation
    log = AuditLog(
        user_id=current_user.id,
        action="Create Alias",
        entity_type="PartNumberAlias",
        entity_id=db_alias.id,
        old_values=None,
        new_values={
            "requested_manufacturer": alias_in.requested_manufacturer,
            "requested_mpn": alias_in.requested_mpn,
            "returned_manufacturer": alias_in.returned_manufacturer,
            "returned_mpn": alias_in.returned_mpn,
            "variant_type": alias_in.variant_type,
            "verification_status": "DRAFT",
            "evidence": alias_in.evidence,
        }
    )
    db.add(log)

    await db.commit()
    await db.refresh(db_alias)

    return db_alias

@router.put("/{alias_id}", response_model=AliasResponse)
async def update_alias_status(alias_id: str, verification_status: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if verification_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification_status. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
        )

    result = await db.execute(select(PartNumberAlias).where(PartNumberAlias.id == alias_id))
    db_alias = result.scalars().first()
    if not db_alias:
        raise HTTPException(status_code=404, detail="Alias not found")

    # Block verification of qualification variants
    if verification_status == "VERIFIED" and db_alias.variant_type == "QUALIFICATION_VARIANT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Qualification variants cannot be verified through the standard workflow. Separate manual engineering review is required."
        )

    previous_status = db_alias.verification_status

    db_alias.verification_status = verification_status
    if verification_status == "VERIFIED":
        db_alias.verified_by = current_user.id

    # Audit trail for status change
    log = AuditLog(
        user_id=current_user.id,
        action="Update Alias Status",
        entity_type="PartNumberAlias",
        entity_id=alias_id,
        old_values={"verification_status": previous_status},
        new_values={"verification_status": verification_status, "verified_by": current_user.id if verification_status == "VERIFIED" else None}
    )
    db.add(log)

    await db.commit()
    await db.refresh(db_alias)
    return db_alias

@router.get("/candidates", response_model=List[AliasReviewCandidateResponse])
async def list_alias_candidates(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(AliasReviewCandidate).where(AliasReviewCandidate.review_status == "PENDING"))
    return result.scalars().all()

@router.post("/candidates/{candidate_id}/convert", response_model=AliasResponse)
async def convert_candidate(candidate_id: str, payload: AliasCandidateConvert, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(AliasReviewCandidate).where(AliasReviewCandidate.id == candidate_id))
    candidate = result.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.review_status != "PENDING":
        raise HTTPException(status_code=400, detail="Candidate is not PENDING")
        
    if payload.action == "REJECT":
        candidate.review_status = "REJECTED"
        candidate.reviewer = current_user.id
        # Audit
        db.add(AuditLog(
            user_id=current_user.id,
            action="Reject Alias Candidate",
            entity_type="AliasReviewCandidate",
            entity_id=candidate.id,
            old_values={"review_status": "PENDING"},
            new_values={"review_status": "REJECTED"}
        ))
        await db.commit()
        raise HTTPException(status_code=200, detail="Candidate rejected")
        
    if payload.action != "CONVERT":
        raise HTTPException(status_code=400, detail="Invalid action")
        
    # Block qualification variants
    if candidate.proposed_variant_type == "QUALIFICATION_VARIANT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Qualification variants require separate manual engineering review."
        )
        
    # Check if duplicate exists
    existing = await db.execute(
        select(PartNumberAlias).where(
            PartNumberAlias.requested_manufacturer == candidate.requested_manufacturer,
            PartNumberAlias.requested_mpn == candidate.requested_mpn,
            PartNumberAlias.returned_manufacturer == candidate.returned_manufacturer,
            PartNumberAlias.returned_mpn == candidate.returned_mpn
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An alias for this relationship already exists."
        )
        
    # Create DRAFT alias
    db_alias = PartNumberAlias(
        requested_manufacturer=candidate.requested_manufacturer,
        requested_mpn=candidate.requested_mpn,
        returned_manufacturer=candidate.returned_manufacturer,
        returned_mpn=candidate.returned_mpn,
        variant_type=candidate.proposed_variant_type,
        verification_status="DRAFT",
        evidence=candidate.evidence,
        verified_by=None
    )
    db.add(db_alias)
    
    candidate.review_status = "CONVERTED_TO_DRAFT"
    candidate.reviewer = current_user.id
    
    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="Convert Alias Candidate",
        entity_type="AliasReviewCandidate",
        entity_id=candidate.id,
        old_values={"review_status": "PENDING"},
        new_values={"review_status": "CONVERTED_TO_DRAFT", "alias_id": db_alias.id}
    ))
    
    await db.commit()
    await db.refresh(db_alias)
    return db_alias

