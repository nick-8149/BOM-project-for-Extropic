from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.models import BOM, BOMItem, Part, PartManufacturer, PartSupplier, RiskAssessment
from app.services.excel_exporter import create_excel_report
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("/bom/{bom_id}/availability")
async def export_availability_report(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Availability Report: Supplier channels sourcing coverage per BOM item (R-16)."""
    result = await db.execute(
        select(BOMItem)
        .options(selectinload(BOMItem.matched_part).selectinload(Part.suppliers).selectinload(PartSupplier.supplier))
        .where(BOMItem.bom_id == bom_id)
    )
    items = result.scalars().all()
    
    headers = ["Line Item", "Original PN", "Manufacturer", "Matched PN", "Supplier Name", "Supplier PN", "Authorized Channel?"]
    rows = []
    
    for item in items:
        part = item.matched_part
        if part and part.suppliers:
            for ps in part.suppliers:
                rows.append([
                    item.serial_number,
                    item.original_part_number,
                    item.original_manufacturer or "—",
                    part.part_number,
                    ps.supplier.name,
                    ps.supplier_part_number,
                    "YES" if ps.supplier.is_authorized else "NO"
                ])
        else:
            rows.append([
                item.serial_number,
                item.original_part_number,
                item.original_manufacturer or "—",
                item.matched_part.part_number if part else "UNMATCHED",
                "NO SUPPLIERS FOUND",
                "—",
                "NO"
            ])
            
    file_data = create_excel_report(
        title=f"BOM Sourcing & Availability Report",
        headers=headers,
        rows=rows,
        summary_data={"Total Line Items": len(items), "Supplier Channels Exported": len(rows)}
    )
    
    return Response(
        content=file_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=BOM_Availability_Report.xlsx"}
    )

@router.get("/bom/{bom_id}/lifecycle")
async def export_lifecycle_report(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Life Cycle Report: EOL predictions per matched BOM item (R-17)."""
    result = await db.execute(
        select(BOMItem)
        .options(selectinload(BOMItem.matched_part).selectinload(Part.lifecycle_info))
        .where(BOMItem.bom_id == bom_id)
    )
    items = result.scalars().all()
    
    headers = ["Line Item", "Original PN", "Matched PN", "Lifecycle Status", "Est. Years to EOL", "Forecast EOL Date"]
    rows = []
    
    for item in items:
        part = item.matched_part
        status = "Unknown"
        years = "—"
        eol_date = "—"
        
        if part and part.lifecycle_info:
            status = part.lifecycle_info.lifecycle_status
            years = part.lifecycle_info.years_to_eol if part.lifecycle_info.years_to_eol is not None else "—"
            eol_date = str(part.lifecycle_info.eol_date) if part.lifecycle_info.eol_date else "—"
            
        rows.append([
            item.serial_number,
            item.original_part_number,
            part.part_number if part else "UNMATCHED",
            status,
            years,
            eol_date
        ])
        
    file_data = create_excel_report(
        title="BOM Components Lifecycle & EOL Forecast Report",
        headers=headers,
        rows=rows,
        summary_data={"Total BOM Items": len(items)}
    )
    
    return Response(
        content=file_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=BOM_Lifecycle_Report.xlsx"}
    )

@router.get("/bom/{bom_id}/rohs")
async def export_rohs_report(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """RoHS Report: Environmental compliance directives per BOM item (R-20)."""
    result = await db.execute(
        select(BOMItem)
        .options(selectinload(BOMItem.matched_part).selectinload(Part.compliance_info))
        .where(BOMItem.bom_id == bom_id)
    )
    items = result.scalars().all()
    
    headers = ["Line Item", "Original PN", "Matched PN", "RoHS Status", "Directive Reference", "Certificate Link"]
    rows = []
    
    for item in items:
        part = item.matched_part
        status = "Unknown"
        ref = "—"
        link = "—"
        
        if part and part.compliance_info:
            status = part.compliance_info.rohs_status
            ref = part.compliance_info.rohs_directive_ref or "—"
            link = part.compliance_info.certificate_link or "—"
            
        rows.append([
            item.serial_number,
            item.original_part_number,
            part.part_number if part else "UNMATCHED",
            status,
            ref,
            link
        ])
        
    file_data = create_excel_report(
        title="BOM Environmental RoHS Compliance Report",
        headers=headers,
        rows=rows,
        summary_data={"Total Items Analyzed": len(items)}
    )
    
    return Response(
        content=file_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=BOM_RoHS_Report.xlsx"}
    )

@router.get("/bom/{bom_id}/country-of-origin")
async def export_origin_report(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Country of Origin Report: Sourcing manufacturing locations (R-22)."""
    result = await db.execute(
        select(BOMItem)
        .options(selectinload(BOMItem.matched_part).selectinload(Part.manufacturers).selectinload(PartManufacturer.manufacturer))
        .where(BOMItem.bom_id == bom_id)
    )
    items = result.scalars().all()
    
    headers = ["Line Item", "Original PN", "Matched PN", "Manufacturer Name", "Country of Origin", "Website"]
    rows = []
    
    for item in items:
        part = item.matched_part
        if part and part.manufacturers:
            for pm in part.manufacturers:
                rows.append([
                    item.serial_number,
                    item.original_part_number,
                    part.part_number,
                    pm.manufacturer.name,
                    pm.manufacturer.country_of_origin or "Unknown",
                    pm.manufacturer.website or "—"
                ])
        else:
            rows.append([
                item.serial_number,
                item.original_part_number,
                item.matched_part.part_number if part else "UNMATCHED",
                "Unknown",
                "Unknown",
                "—"
            ])
            
    file_data = create_excel_report(
        title="BOM Country of Origin Sourcing Log",
        headers=headers,
        rows=rows,
        summary_data={"Total Items": len(items)}
    )
    
    return Response(
        content=file_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=BOM_Country_of_Origin_Report.xlsx"}
    )
