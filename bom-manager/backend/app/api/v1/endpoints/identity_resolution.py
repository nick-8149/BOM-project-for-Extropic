from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import pandas as pd
import os

from app.database import get_db
from app.models.models import PartNumberMapping, User
from app.api.v1.deps import get_current_user
from app.schemas.identity_resolution import (
    IdentityResolutionSummary, 
    IdentityResolutionListResponse, 
    IdentityResolutionRecord,
    ManufacturerCandidate
)
from app.services.identity.resolver import IdentityResolver
from app.services.identity.part_classifier import PartClassifier
from app.services.identity.manufacturer_parser import ManufacturerParser
from app.services.identity.manufacturer_canonicalizer import ManufacturerCanonicalizer

router = APIRouter()

# For this step, we read from the actual BOM file (per requirement to not break existing app logic or seed data).
# In a fully integrated system, this would read from `bom_items` table.
BOM_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "6004ce57-1c92-4b0e-b4b7-d782630adeb0.xlsx")

async def get_bom_dataframe():
    if not os.path.exists(BOM_FILE):
        return pd.DataFrame()
    df = pd.read_excel(BOM_FILE, skiprows=1)
    cols = list(df.columns)
    pn_col = "Part Number" if "Part Number" in cols else cols[1] if len(cols) > 1 else None
    mfr_col = "Manufacturer" if "Manufacturer" in cols else cols[3] if len(cols) > 3 else None
    
    # Standardize column names
    df = df.rename(columns={pn_col: "Part Number", mfr_col: "Manufacturer"})
    # Add an ID column
    df['id'] = df.index.astype(str)
    return df

@router.get("/summary", response_model=IdentityResolutionSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    df = await get_bom_dataframe()
    if df.empty:
        return IdentityResolutionSummary(total_rows=0, total_mpns=0, total_ipns=0, resolved=0, requires_mpn_mapping=0, ambiguous=0, missing_data=0, requires_manufacturer_review=0)
        
    counts = {
        "RESOLVED": 0,
        "REQUIRES_MPN_MAPPING": 0,
        "REQUIRES_MANUFACTURER_REVIEW": 0,
        "AMBIGUOUS": 0,
        "MISSING_DATA": 0
    }
    
    mpn_count = 0
    ipn_count = 0
    
    for _, row in df.iterrows():
        raw_pn = str(row.get("Part Number", "")).strip()
        if raw_pn == "nan": raw_pn = ""
        raw_mfr = str(row.get("Manufacturer", "")).strip()
        if raw_mfr == "nan": raw_mfr = ""
        
        identity = await IdentityResolver.resolve(raw_pn, raw_mfr, db)
        counts[identity.resolution_status] += 1
        
        if identity.part_number_type == "MPN":
            mpn_count += 1
        elif identity.part_number_type == "IPN":
            ipn_count += 1

    return IdentityResolutionSummary(
        total_rows=len(df),
        total_mpns=mpn_count,
        total_ipns=ipn_count,
        resolved=counts["RESOLVED"],
        requires_mpn_mapping=counts["REQUIRES_MPN_MAPPING"],
        ambiguous=counts["AMBIGUOUS"],
        missing_data=counts["MISSING_DATA"],
        requires_manufacturer_review=counts["REQUIRES_MANUFACTURER_REVIEW"]
    )


@router.get("/records", response_model=IdentityResolutionListResponse)
async def get_records(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    resolution_status: Optional[str] = None,
    classification: Optional[str] = None,
    verification_status: Optional[str] = None
):
    df = await get_bom_dataframe()
    if df.empty:
        return IdentityResolutionListResponse(items=[], total=0, page=page, page_size=page_size, has_next=False)

    records = []
    # Pre-fetch all mappings to avoid N+1 queries during memory processing
    mappings_result = await db.execute(select(PartNumberMapping))
    mappings = {m.internal_part_number: m for m in mappings_result.scalars().all()}
    
    # We iterate and build the response
    for _, row in df.iterrows():
        raw_pn = str(row.get("Part Number", "")).strip()
        if raw_pn == "nan": raw_pn = ""
        raw_mfr = str(row.get("Manufacturer", "")).strip()
        if raw_mfr == "nan": raw_mfr = ""
        row_id = str(row['id'])

        if search and search.lower() not in raw_pn.lower() and search.lower() not in raw_mfr.lower():
            continue

        # Re-implement resolution logic efficiently using the pre-fetched mapping
        pn_type = PartClassifier.classify(raw_pn)
        if classification and pn_type != classification.upper():
            continue
            
        parsed_mfrs = ManufacturerParser.parse(raw_mfr)
        
        mfr_candidates = []
        for mfr in parsed_mfrs:
            mapped = ManufacturerCanonicalizer.canonicalize(mfr)
            mfr_candidates.append(ManufacturerCandidate(
                raw=mapped.raw_name,
                canonical=mapped.canonical_name,
                status=mapped.mapping_status
            ))

        res_status = "MISSING_DATA"
        if raw_pn and parsed_mfrs:
            if len(parsed_mfrs) > 1:
                res_status = "AMBIGUOUS"
            else:
                mapping_info = mfr_candidates[0]
                if mapping_info.status == "POSSIBLE_ALIAS":
                    res_status = "REQUIRES_MANUFACTURER_REVIEW"
                else:
                    if pn_type == "MPN":
                        res_status = "RESOLVED"
                    elif pn_type == "IPN":
                        if raw_pn in mappings and mappings[raw_pn].verification_status == "VERIFIED":
                            res_status = "RESOLVED"
                        else:
                            res_status = "REQUIRES_MPN_MAPPING"
                    else:
                        res_status = "AMBIGUOUS"

        if resolution_status and res_status != resolution_status.upper():
            continue
            
        mapping = mappings.get(raw_pn)
        map_verif_status = mapping.verification_status if mapping else None
        
        if verification_status and map_verif_status != verification_status.upper():
            continue
            
        mpn = None
        if pn_type == "MPN":
            mpn = raw_pn
        elif mapping and mapping.verification_status == "VERIFIED":
            mpn = mapping.manufacturer_part_number

        # Calculate lifecycle blocked reason
        allowed = False
        reason = "A verified IPN-to-MPN mapping is required before lifecycle lookup."
        
        if res_status == "RESOLVED":
            allowed = True
            reason = None
        elif res_status == "AMBIGUOUS":
            reason = "AMBIGUOUS_MANUFACTURER"
        elif res_status == "MISSING_DATA":
            reason = "MISSING_DATA"
        elif res_status == "REQUIRES_MPN_MAPPING":
            reason = "IDENTITY_NOT_VERIFIED"
        elif res_status == "REQUIRES_MANUFACTURER_REVIEW":
            reason = "IDENTITY_NOT_RESOLVED"

        records.append(IdentityResolutionRecord(
            id=row_id,
            internal_part_number=raw_pn if raw_pn else None,
            manufacturer_raw=raw_mfr if raw_mfr else None,
            manufacturers=mfr_candidates,
            part_classification=pn_type if pn_type in ["IPN", "MPN"] else "UNKNOWN",
            manufacturer_part_number=mpn,
            resolution_status=res_status,
            verification_status=map_verif_status,
            mapping_id=mapping.id if mapping else None,
            lifecycle_lookup_allowed=allowed,
            lifecycle_block_reason=reason
        ))

    total = len(records)
    start = (page - 1) * page_size
    end = start + page_size
    items = records[start:end]

    return IdentityResolutionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=end < total
    )
