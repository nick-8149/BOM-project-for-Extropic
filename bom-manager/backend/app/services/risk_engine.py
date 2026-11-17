from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, date

from app.models.models import BOMItem, Part, RiskAssessment, LifecycleInfo, ComplianceInfo, PartSupplier
from app.models.lifecycle import PartIdentityLifecycle
from app.config import settings

# ── STEP 44 INTEGRATION ──────────────────────────────────────────────────────
# The risk engine prioritizes verified lifecycle data from PartIdentityLifecycle
# (genuine Nexar records). If real verified data is unavailable, it falls back
# to global catalog seed/demo data or standard baseline defaults, explicitly
# recording data provenance in the assessment notes.
# ──────────────────────────────────────────────────────────────────────────────

async def calculate_bom_item_risk(
    item: BOMItem,
    db: AsyncSession
) -> RiskAssessment:
    """
    Computes a weighted risk score (0-100) and risk level (Low, Medium, High)
    for a given matched BOM item.
    Prioritizes verified PartIdentityLifecycle (Nexar) over seed/demo LifecycleInfo.
    """
    lifecycle_risk = 0.0
    eol_risk = 0.0
    supplier_risk = 0.0
    compliance_risk = 0.0
    match_confidence_risk = 0.0

    # 1. Match Confidence Risk (100 - match confidence score)
    match_confidence_risk = max(0.0, 100.0 - item.confidence_score)

    # 1.5 Check PartIdentityLifecycle for verified real Nexar record
    pil_record = None
    if item.original_part_number:
        pil_res = await db.execute(
            select(PartIdentityLifecycle).where(
                PartIdentityLifecycle.internal_part_number == item.original_part_number
            )
        )
        pil_record = pil_res.scalars().first()

    part = None
    if item.matched_part_id:
        result = await db.execute(
            select(Part)
            .options(
                selectinload(Part.lifecycle_info),
                selectinload(Part.compliance_info),
                selectinload(Part.suppliers).selectinload(PartSupplier.supplier)
            )
            .where(Part.id == item.matched_part_id)
        )
        part = result.scalars().first()

    # Determine Lifecycle Source and Status
    lifecycle_source = "unknown"
    lifecycle_status = None
    years_to_eol = None
    has_real_lifecycle = False

    # 1. Genuine external lifecycle data from PartIdentityLifecycle takes absolute priority
    if pil_record and pil_record.provider == "nexar" and pil_record.lookup_status == "SUCCESS" and pil_record.verification_status == "VERIFIED":
        lifecycle_source = "nexar"
        lifecycle_status = pil_record.lifecycle_status
        has_real_lifecycle = True
        if pil_record.end_of_life_date:
            years_to_eol = (pil_record.end_of_life_date.date() - date.today()).days / 365.25
    elif part and part.lifecycle_info and part.lifecycle_info.lifecycle_status:
        # STEP 49 INTEGRITY ENFORCEMENT:
        # Seed/demo lifecycle data from the reference catalog must NOT be treated as
        # genuine lifecycle evidence for a production BOM item merely because fuzzy matching
        # attached a catalog part. The BOM item's genuine lifecycle remains unverified/unknown.
        lifecycle_source = "catalog_seed_unverified"
        lifecycle_status = None
        years_to_eol = None
        has_real_lifecycle = False

    # 2. Lifecycle Status & EOL Risk
    if lifecycle_status and has_real_lifecycle:
        status = lifecycle_status.upper()
        if status == "OBSOLETE":
            lifecycle_risk = 100.0
        elif status == "DEPRECATED":
            lifecycle_risk = 80.0
        elif status == "NRND":
            lifecycle_risk = 60.0
        elif status == "ACTIVE":
            lifecycle_risk = 0.0
        else:
            lifecycle_risk = 50.0

        if years_to_eol is not None:
            if years_to_eol <= 0:
                eol_risk = 100.0
            elif years_to_eol <= settings.EOL_ALERT_THRESHOLD_YEARS:
                eol_risk = 50.0 + (50.0 * (1.0 - (years_to_eol / settings.EOL_ALERT_THRESHOLD_YEARS)))
            else:
                eol_risk = 0.0
        else:
            eol_risk = 0.0 if status == "ACTIVE" else 50.0
    else:
        # Genuine lifecycle evidence is unavailable for this BOM item.
        # We do NOT treat missing evidence as proof that a component is obsolete (100.0).
        # We score evidence uncertainty with a moderate baseline (50.0).
        lifecycle_risk = 50.0
        eol_risk = 50.0

    # 3. Compliance and Supplier Risk
    if part:
        # Compliance Risk (RoHS)
        if part.compliance_info:
            rohs = part.compliance_info.rohs_status.upper()
            if "NON-COMPLIANT" in rohs:
                compliance_risk = 100.0
            elif "COMPLIANT" in rohs:
                compliance_risk = 0.0
            else:
                compliance_risk = 50.0
        else:
            compliance_risk = 50.0

        # Supplier Sourcing Risk
        if part.suppliers:
            unauthorized_count = sum(1 for ps in part.suppliers if not ps.supplier.is_authorized)
            total_suppliers = len(part.suppliers)
            if unauthorized_count == total_suppliers:
                supplier_risk = 90.0
            elif unauthorized_count > 0:
                supplier_risk = 50.0
            else:
                supplier_risk = 0.0
        else:
            supplier_risk = 100.0
    else:
        compliance_risk = 50.0
        supplier_risk = 100.0

    # Weighted Overall Score Formula
    overall_score = (
        lifecycle_risk * 0.25 +
        eol_risk * 0.20 +
        supplier_risk * 0.15 +
        compliance_risk * 0.20 +
        match_confidence_risk * 0.20
    )

    risk_level = "Low"
    if overall_score >= 70.0:
        risk_level = "High"
    elif overall_score >= 40.0:
        risk_level = "Medium"

    # Save or update database RiskAssessment record
    assessment_result = await db.execute(
        select(RiskAssessment).where(RiskAssessment.bom_item_id == item.id)
    )
    db_assessment = assessment_result.scalars().first()

    if not db_assessment:
        db_assessment = RiskAssessment(
            bom_item_id=item.id,
            part_id=item.matched_part_id
        )
        db.add(db_assessment)

    db_assessment.overall_risk_score = round(overall_score, 2)
    db_assessment.risk_level = risk_level
    db_assessment.lifecycle_risk = round(lifecycle_risk, 2)
    db_assessment.eol_risk = round(eol_risk, 2)
    db_assessment.supplier_risk = round(supplier_risk, 2)
    db_assessment.compliance_risk = round(compliance_risk, 2)
    db_assessment.match_confidence_risk = round(match_confidence_risk, 2)

    if has_real_lifecycle:
        db_assessment.notes = f"Risk evaluated using verified Nexar lifecycle data."
    elif lifecycle_source == "seed/demo":
        db_assessment.notes = f"Real lifecycle data unavailable; using seed/demo catalog baseline."
    else:
        db_assessment.notes = f"Real lifecycle data unavailable for this component."

    db_assessment.assessed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_assessment)
    return db_assessment
