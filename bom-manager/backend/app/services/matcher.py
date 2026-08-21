"""
Matching Engine: Layered strategy for matching BOM items against the parts database.

Levels (per implementation plan):
  Level 1: Exact part_number match             → confidence 100%
  Level 2: Normalized part_number match         → confidence 95%
  Level 3: Part_number + manufacturer match     → confidence 90%
  Level 4: Fuzzy match (RapidFuzz, ≥ threshold) → confidence = fuzzy score
  Level 5: (Phase 9) Semantic/embedding match   → future
  Level 6: Mark as Manual Review                → confidence < threshold
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from rapidfuzz import fuzz, process as rf_process
from typing import Optional, Tuple

from app.models.models import Part, PartManufacturer, Manufacturer
from app.services.bom_normalizer import normalize_part_number, normalize_manufacturer_name
from app.config import settings


async def find_match(
    part_number: str,
    manufacturer_name: str,
    db: AsyncSession
) -> Tuple[Optional[str], float, str]:
    """
    Attempts to match a BOM line item against the parts database.

    Returns:
        (matched_part_id, confidence_score, validation_status)
    """

    # ── Level 1: Exact Match ────────────────────────────────
    result = await db.execute(
        select(Part).where(Part.part_number == part_number)
    )
    exact = result.scalars().first()
    if exact:
        return exact.id, 100.0, "Matched"

    # ── Level 2: Normalized Match ───────────────────────────
    norm_pn = normalize_part_number(part_number)
    # We need to check all parts by normalizing their stored numbers
    all_parts_result = await db.execute(select(Part))
    all_parts = all_parts_result.scalars().all()

    for p in all_parts:
        if normalize_part_number(p.part_number) == norm_pn:
            return p.id, 95.0, "Matched"

    # ── Level 3: Part Number + Manufacturer ─────────────────
    norm_mfr = normalize_manufacturer_name(manufacturer_name)
    if norm_mfr:
        # Find manufacturer in DB
        mfr_result = await db.execute(
            select(Manufacturer).where(Manufacturer.name == norm_mfr)
        )
        mfr = mfr_result.scalars().first()

        if mfr:
            # Check PartManufacturer for matching MPN
            pm_result = await db.execute(
                select(PartManufacturer)
                .options(selectinload(PartManufacturer.part))
                .where(PartManufacturer.manufacturer_id == mfr.id)
            )
            for pm in pm_result.scalars().all():
                if normalize_part_number(pm.manufacturer_part_number) == norm_pn:
                    return pm.part_id, 90.0, "Matched"

    # ── Level 4: Fuzzy Match (RapidFuzz) ────────────────────
    if all_parts:
        part_numbers = [p.part_number for p in all_parts]
        part_id_map = {p.part_number: p.id for p in all_parts}

        # Use token_sort_ratio for flexible matching
        best_match = rf_process.extractOne(
            part_number,
            part_numbers,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=settings.FUZZY_MATCH_THRESHOLD
        )

        if best_match:
            matched_pn, score, _ = best_match
            matched_id = part_id_map[matched_pn]

            if score >= settings.HIGH_CONFIDENCE_THRESHOLD:
                return matched_id, float(score), "Matched"
            elif score >= settings.MEDIUM_CONFIDENCE_THRESHOLD:
                return matched_id, float(score), "Suggested Match"
            else:
                return matched_id, float(score), "Manual Review"

    # ── Level 6: No Match Found ─────────────────────────────
    return None, 0.0, "Unmatched"
