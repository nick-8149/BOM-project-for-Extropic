from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.models.models import Part, PartManufacturer, ReplacementCandidate, ComplianceInfo, LifecycleInfo
from rapidfuzz import fuzz, process as rf_process

async def find_replacement_candidates(
    part_id: str,
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """
    Search database for pin-compatible replacement components (R-05).
    Filters replacements by matching the original part's package type,
    ensures they are RoHS compliant, and ranks them by descriptive similarity.
    """
    candidates = []

    # 1. Fetch original part details
    original_result = await db.execute(
        select(Part)
        .options(selectinload(Part.compliance_info))
        .where(Part.id == part_id)
    )
    orig_part = original_result.scalars().first()
    if not orig_part or not orig_part.package_type:
        return []

    # 2. Query potential candidates in same category + package type
    potential_result = await db.execute(
        select(Part)
        .options(
            selectinload(Part.compliance_info),
            selectinload(Part.lifecycle_info),
            selectinload(Part.manufacturers).selectinload(PartManufacturer.manufacturer)
        )
        .where(
            Part.id != part_id,
            Part.category == orig_part.category,
            Part.package_type == orig_part.package_type
        )
    )
    potentials = potential_result.scalars().all()

    for p in potentials:
        # Check RoHS compliance (replacement must be compliant)
        is_compliant = False
        if p.compliance_info and p.compliance_info.rohs_status.upper() == "COMPLIANT":
            is_compliant = True

        # Check Lifecycle (avoid NRND/Obsolete alternatives)
        is_active = True
        if p.lifecycle_info and p.lifecycle_info.lifecycle_status.upper() in ["OBSOLETE", "NRND", "DEPRECATED"]:
            is_active = False

        if is_compliant and is_active:
            # Calculate descriptive similarity as recommendation score
            score = fuzz.token_sort_ratio(orig_part.description or "", p.description or "")
            
            # Find manufacturer
            mfr_name = "Unknown"
            if p.manufacturers:
                mfr_name = p.manufacturers[0].manufacturer.name

            candidates.append({
                "replacement_part_id": p.id,
                "replacement_part_number": p.part_number,
                "replacement_description": p.description,
                "replacement_manufacturer": mfr_name,
                "confidence_score": float(score),
                "reason": f"Active RoHS Compliant pin-compatible fit in {p.package_type} packaging."
            })

    # Sort candidates by similarity score descending
    candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
    return candidates
