from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, date

from app.models.models import BOMItem, Part, RiskAssessment, LifecycleInfo, ComplianceInfo, PartSupplier
from app.config import settings

async def calculate_bom_item_risk(
    item: BOMItem,
    db: AsyncSession
) -> RiskAssessment:
    """
    Computes a weighted risk score (0-100) and risk level (Low, Medium, High)
    for a given matched BOM item.
    """
    lifecycle_risk = 0.0
    eol_risk = 0.0
    supplier_risk = 0.0
    compliance_risk = 0.0
    match_confidence_risk = 0.0

    # 1. Match Confidence Risk (100 - match confidence score)
    match_confidence_risk = max(0.0, 100.0 - item.confidence_score)

    if item.matched_part_id:
        # Load part relations
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

        if part:
            # 2. Lifecycle Status Risk
            if part.lifecycle_info:
                status = part.lifecycle_info.lifecycle_status.upper()
                if status == "OBSOLETE":
                    lifecycle_risk = 100.0
                elif status == "DEPRECATED":
                    lifecycle_risk = 80.0
                elif status == "NRND":
                    lifecycle_risk = 60.0
                elif status == "ACTIVE":
                    lifecycle_risk = 0.0

                # 3. EOL Proximity Risk (Alert if EOL < threshold)
                years = part.lifecycle_info.years_to_eol
                if years is not None:
                    if years <= 0:
                        eol_risk = 100.0
                    elif years <= settings.EOL_ALERT_THRESHOLD_YEARS:
                        # Scale risk linearly up to 100 as years approach 0
                        eol_risk = 50.0 + (50.0 * (1.0 - (years / settings.EOL_ALERT_THRESHOLD_YEARS)))
                    else:
                        eol_risk = 0.0
            else:
                lifecycle_risk = 50.0 # Unknown

            # 4. Compliance Risk (RoHS)
            if part.compliance_info:
                rohs = part.compliance_info.rohs_status.upper()
                if "NON-COMPLIANT" in rohs:
                    compliance_risk = 100.0
                elif "COMPLIANT" in rohs:
                    compliance_risk = 0.0
                else:
                    compliance_risk = 50.0 # Unknown
            else:
                compliance_risk = 50.0

            # 5. Supplier Sourcing Risk (Suspicious or suspended channels)
            if part.suppliers:
                unauthorized_count = sum(1 for ps in part.suppliers if not ps.supplier.is_authorized)
                total_suppliers = len(part.suppliers)
                if unauthorized_count == total_suppliers:
                    supplier_risk = 90.0 # Only unauthorized sources
                elif unauthorized_count > 0:
                    supplier_risk = 50.0 # Mixed sources
                else:
                    supplier_risk = 0.0 # All authorized
            else:
                supplier_risk = 100.0 # No sourcing channels available

    else:
        # Unmatched Item Risk
        lifecycle_risk = 100.0
        eol_risk = 100.0
        supplier_risk = 100.0
        compliance_risk = 50.0

    # Weighted Overall Score Formula (Proposed Design Decision)
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
    db_assessment.notes = f"Risk computed dynamically on matching resolution."
    db_assessment.assessed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_assessment)
    return db_assessment
