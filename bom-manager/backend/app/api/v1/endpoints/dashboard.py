from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from typing import Dict, Any, List
from datetime import datetime, date

from app.database import get_db
from app.models.models import (
    BOM, BOMItem, Part, PartManufacturer, PartSupplier, Supplier, 
    LifecycleInfo, ComplianceInfo, RiskAssessment, PCN, ReplacementCandidate
)
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("/overview")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Fetch user's BOMs
    boms_res = await db.execute(
        select(BOM)
        .where(BOM.uploaded_by == current_user.id)
        .order_by(BOM.uploaded_at.desc())
    )
    boms = boms_res.scalars().all()
    total_boms = len(boms)

    # 2. Fetch all Parts in Catalog
    parts_res = await db.execute(
        select(Part)
        .options(
            selectinload(Part.lifecycle_info),
            selectinload(Part.compliance_info),
            selectinload(Part.suppliers).selectinload(PartSupplier.supplier)
        )
    )
    parts = parts_res.scalars().all()
    total_components = len(parts)

    # 3. Calculate lifecycle distribution
    lifecycle_distribution = {
        "Active": 0,
        "NRND": 0,
        "Obsolete": 0,
        "Deprecated": 0,
        "Unknown": 0
    }
    obsolete_count = 0
    for p in parts:
        status = "Unknown"
        if p.lifecycle_info and p.lifecycle_info.lifecycle_status:
            status = p.lifecycle_info.lifecycle_status.title()
            if status == "Obsolete":
                obsolete_count += 1
        if status in lifecycle_distribution:
            lifecycle_distribution[status] += 1
        else:
            lifecycle_distribution["Unknown"] += 1

    # 4. Calculate compliance overview
    compliance_overview = {
        "compliant": 0,
        "non_compliant": 0,
        "unknown": 0
    }
    compliance_issues_count = 0
    for p in parts:
        status = "unknown"
        if p.compliance_info and p.compliance_info.rohs_status:
            rohs = p.compliance_info.rohs_status.lower()
            if "non-compliant" in rohs:
                status = "non_compliant"
                compliance_issues_count += 1
            elif "compliant" in rohs:
                status = "compliant"
        compliance_overview[status] += 1

    # 5. Fetch user's BOM items for matching stats and risk assessments
    user_bom_ids = [b.id for b in boms]
    matched_components = 0
    match_quality = {
        "matched": 0,
        "review": 0,
        "unmatched": 0
    }
    high_risk_components_count = 0
    risk_distribution = {
        "Low": 0,
        "Medium": 0,
        "High": 0,
        "Critical": 0
    }

    all_bom_items = []
    if user_bom_ids:
        items_res = await db.execute(
            select(BOMItem)
            .options(
                selectinload(BOMItem.risk_assessment),
                selectinload(BOMItem.matched_part).selectinload(Part.lifecycle_info),
                selectinload(BOMItem.matched_part).selectinload(Part.compliance_info),
                selectinload(BOMItem.bom)
            )
            .where(BOMItem.bom_id.in_(user_bom_ids))
        )
        all_bom_items = items_res.scalars().all()

        for item in all_bom_items:
            status = item.validation_status or "Unmatched"
            if status == "Matched":
                match_quality["matched"] += 1
                matched_components += 1
            elif status == "Unmatched":
                match_quality["unmatched"] += 1
            else:
                match_quality["review"] += 1

            # Risk Assessment distribution
            if item.risk_assessment:
                score = item.risk_assessment.overall_risk_score or 0.0
                if score >= 85.0:
                    risk_distribution["Critical"] += 1
                    high_risk_components_count += 1
                elif score >= 70.0:
                    risk_distribution["High"] += 1
                    high_risk_components_count += 1
                elif score >= 40.0:
                    risk_distribution["Medium"] += 1
                else:
                    risk_distribution["Low"] += 1
            else:
                risk_distribution["Low"] += 1

    # 6. EOL Timeline
    eol_list = []
    for p in parts:
        if p.lifecycle_info and p.lifecycle_info.eol_date:
            eol_date_val = p.lifecycle_info.eol_date
            years_rem = p.lifecycle_info.years_to_eol
            
            # Simple risk mapping
            risk = "Low"
            if years_rem is not None:
                if years_rem <= 1.0:
                    risk = "Critical"
                elif years_rem <= 2.0:
                    risk = "High"
                elif years_rem <= 5.0:
                    risk = "Medium"

            eol_list.append({
                "part_number": p.part_number,
                "eol_date": eol_date_val.isoformat(),
                "years_remaining": round(years_rem, 2) if years_rem is not None else 0.0,
                "risk": risk
            })
    eol_list.sort(key=lambda x: x["years_remaining"])
    
    # 7. Components requiring attention (sort by risk score or priority conditions)
    attention_list = []
    for item in all_bom_items:
        score = item.risk_assessment.overall_risk_score if item.risk_assessment else 0.0
        level = item.risk_assessment.risk_level if item.risk_assessment else "Low"
        
        issue = None
        priority = "Low"

        # Determine issue and priority
        if item.matched_part and item.matched_part.lifecycle_info and item.matched_part.lifecycle_info.lifecycle_status.upper() == "OBSOLETE":
            issue = "Obsolete Part"
            priority = "Critical"
        elif item.matched_part and item.matched_part.lifecycle_info and item.matched_part.lifecycle_info.years_to_eol is not None and item.matched_part.lifecycle_info.years_to_eol <= 1.0:
            issue = "EOL Approaching"
            priority = "High"
        elif item.matched_part and item.matched_part.compliance_info and "non-compliant" in item.matched_part.compliance_info.rohs_status.lower():
            issue = "Compliance Issue"
            priority = "High"
        elif item.confidence_score < 70.0:
            issue = "Low Match Confidence"
            priority = "Medium"
        elif item.validation_status == "Unmatched":
            issue = "Unmatched Part"
            priority = "High"

        # If it has a high overall risk score but no specific issue matched, label generic
        if not issue and score >= 40.0:
            issue = "High Sourcing/Lifecycle Risk"
            priority = "High" if score >= 70.0 else "Medium"

        if issue:
            attention_list.append({
                "id": item.id,
                "part_number": item.original_part_number,
                "issue": issue,
                "risk_score": score,
                "priority": priority,
                "lifecycle": item.matched_part.lifecycle_info.lifecycle_status if (item.matched_part and item.matched_part.lifecycle_info) else "Unknown",
                "bom_id": item.bom_id,
                "bom_name": item.bom.name
            })
    
    attention_list.sort(key=lambda x: (-x["risk_score"] if x["risk_score"] else 0.0, x["priority"] == "Critical", x["priority"] == "High"))

    # 8. Supplier sourcing risk (Single vs multi sourcing)
    supplier_risk = {
        "multi_source": 0,
        "limited_source": 0,
        "single_source": 0,
        "single_source_parts": []
    }
    for p in parts:
        approved_suppliers = [ps for ps in p.suppliers if ps.is_approved]
        count = len(approved_suppliers)
        if count >= 3:
            supplier_risk["multi_source"] += 1
        elif count == 2:
            supplier_risk["limited_source"] += 1
        elif count == 1:
            supplier_risk["single_source"] += 1
            supplier_risk["single_source_parts"].append({
                "id": p.id,
                "part_number": p.part_number,
                "supplier_name": approved_suppliers[0].supplier.name,
                "supplier_part_number": approved_suppliers[0].supplier_part_number
            })
        else:
            supplier_risk["single_source"] += 1 # 0 suppliers is also a risk

    # 9. Replacement opportunities
    rep_res = await db.execute(
        select(ReplacementCandidate)
        .options(
            selectinload(ReplacementCandidate.original_part),
            selectinload(ReplacementCandidate.replacement_part)
        )
        .order_by(ReplacementCandidate.created_at.desc())
        .limit(10)
    )
    reps = rep_res.scalars().all()
    replacements_list = []
    for r in reps:
        replacements_list.append({
            "original_part_number": r.original_part.part_number,
            "original_lifecycle": r.original_part.lifecycle_info.lifecycle_status if r.original_part.lifecycle_info else "Unknown",
            "replacement_part_number": r.replacement_part.part_number,
            "confidence_score": r.confidence_score,
            "review_status": r.action_taken or "Suggested"
        })

    # 10. PCN Alerts
    pcn_res = await db.execute(
        select(PCN)
        .options(selectinload(PCN.part))
        .order_by(PCN.created_at.desc())
        .limit(10)
    )
    pcns = pcn_res.scalars().all()
    alerts_list = []
    for p in pcns:
        severity = "Medium"
        if "eol" in p.change_type.lower() or "end of life" in p.change_type.lower():
            severity = "High"
        
        alerts_list.append({
            "id": p.id,
            "severity": severity,
            "title": f"{p.change_type}: {p.part.part_number}",
            "timestamp": p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat(),
            "description": p.description
        })

    # 11. Recent BOM activity
    recent_boms_list = []
    for b in boms[:5]:
        # Compute dynamic match rate
        match_rate = (b.matched_items / b.total_items * 100) if b.total_items > 0 else 0.0
        
        # Calculate overall BOM risk score by averaging BOM item risk scores
        bom_items_res = await db.execute(select(BOMItem).where(BOMItem.bom_id == b.id))
        bom_items = bom_items_res.scalars().all()
        
        item_scores = []
        for item in bom_items:
            item_risk_res = await db.execute(select(RiskAssessment).where(RiskAssessment.bom_item_id == item.id))
            item_risk = item_risk_res.scalars().first()
            if item_risk:
                item_scores.append(item_risk.overall_risk_score)
        
        avg_risk = round(sum(item_scores) / len(item_scores), 2) if item_scores else 0.0

        recent_boms_list.append({
            "id": b.id,
            "name": b.name,
            "uploaded_at": b.uploaded_at.isoformat(),
            "total_items": b.total_items,
            "match_rate": round(match_rate, 2),
            "risk_score": avg_risk,
            "status": b.status
        })

    return {
        "summary": {
            "total_components": total_components,
            "matched_components": matched_components,
            "high_risk_components": high_risk_components_count,
            "obsolete_components": obsolete_count,
            "compliance_issues": compliance_issues_count,
            "total_boms": total_boms
        },
        "lifecycle_distribution": lifecycle_distribution,
        "risk_distribution": risk_distribution,
        "components_requiring_attention": attention_list[:10],
        "compliance_overview": compliance_overview,
        "eol_timeline": eol_list[:10],
        "recent_boms": recent_boms_list,
        "match_quality": match_quality,
        "supplier_risk": supplier_risk,
        "replacement_opportunities": replacements_list,
        "recent_alerts": alerts_list
    }
