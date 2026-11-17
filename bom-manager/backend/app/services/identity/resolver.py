from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import PartNumberMapping
from app.services.identity.models import ResolvedPartIdentity
from app.services.identity.manufacturer_parser import ManufacturerParser
from app.services.identity.manufacturer_canonicalizer import ManufacturerCanonicalizer
from app.services.identity.part_classifier import PartClassifier

class IdentityResolver:
    
    @staticmethod
    async def resolve(raw_pn: str, raw_mfr: str, db: AsyncSession) -> ResolvedPartIdentity:
        """
        Resolves the part identity from raw strings.
        If it's an IPN, it looks up the verified MPN mapping.
        """
        # 1. Classify Part Number
        pn_type = PartClassifier.classify(raw_pn)
        
        # 2. Parse Manufacturer
        parsed_mfrs = ManufacturerParser.parse(raw_mfr)
        
        # Default initialization
        identity = ResolvedPartIdentity(
            original_part_number=str(raw_pn).strip() if raw_pn else "",
            part_number_type=pn_type,
            manufacturer_raw=str(raw_mfr).strip() if raw_mfr else "",
            resolution_status="MISSING_DATA",
            resolution_source="Direct"
        )
        
        if not identity.original_part_number:
            identity.resolution_status = "MISSING_DATA"
            return identity
            
        if not parsed_mfrs:
            identity.resolution_status = "MISSING_DATA"
            return identity
        
        # 3. Check for an existing VERIFIED mapping FIRST.
        # A verified mapping is authoritative and overrides raw BOM ambiguity.
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(PartNumberMapping)
            .options(selectinload(PartNumberMapping.manufacturer))
            .where(
                PartNumberMapping.internal_part_number == identity.original_part_number
            )
        )
        mapping = result.scalar_one_or_none()
        
        if mapping and mapping.verification_status == "VERIFIED":
            identity.manufacturer_part_number = mapping.manufacturer_part_number
            identity.resolution_status = "RESOLVED"
            identity.resolution_confidence = 1.0
            identity.resolution_source = "part_number_mapping_table"
            # Use the verified manufacturer from the mapping
            mfr_rel = getattr(mapping, 'manufacturer', None)
            if mfr_rel:
                identity.manufacturer_canonical = mfr_rel.name
                identity.manufacturer_id = mapping.manufacturer_id
            elif len(parsed_mfrs) == 1:
                mfr_mapping = ManufacturerCanonicalizer.canonicalize(parsed_mfrs[0])
                identity.manufacturer_canonical = mfr_mapping.canonical_name
            return identity
            
        # 4. No verified mapping — check manufacturer ambiguity
        if len(parsed_mfrs) > 1:
            # We have multiple manufacturers (e.g. comma separated list).
            # This is ambiguous and cannot be automatically resolved for a single lookup.
            identity.resolution_status = "AMBIGUOUS"
            return identity
            
        # Single manufacturer found
        mfr_str = parsed_mfrs[0]
        mfr_mapping = ManufacturerCanonicalizer.canonicalize(mfr_str)
        
        if mfr_mapping.mapping_status == "POSSIBLE_ALIAS":
            identity.resolution_status = "REQUIRES_MANUFACTURER_REVIEW"
            identity.manufacturer_canonical = mfr_mapping.canonical_name
            return identity
            
        identity.manufacturer_canonical = mfr_mapping.canonical_name
        
        # 5. Handle IPN vs MPN
        if pn_type == "MPN":
            identity.manufacturer_part_number = identity.original_part_number
            identity.resolution_status = "RESOLVED"
            identity.resolution_confidence = 0.9
            
        elif pn_type == "IPN":
            # No verified mapping found (checked above), so it requires mapping
            identity.resolution_status = "REQUIRES_MPN_MAPPING"
                
        else:
            identity.resolution_status = "AMBIGUOUS"
            
        return identity

    @staticmethod
    def can_lookup_lifecycle(identity: ResolvedPartIdentity) -> bool:
        """
        Gatekeeper function. Returns True ONLY if it is safe to query the lifecycle API.
        """
        if identity.resolution_status != "RESOLVED":
            return False
            
        if not identity.manufacturer_part_number:
            return False
            
        if not identity.manufacturer_canonical:
            return False
            
        return True
