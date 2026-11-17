from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.models import BOM, BOMItem, PartNumberMapping
from app.models.lifecycle import PartIdentityLifecycle
from app.services.identity.resolver import IdentityResolver
from app.services.identity.models import ResolvedPartIdentity
from .provider import LifecycleProvider
from .models import LifecycleData


# Maps resolution_status to a human-readable block reason
_BLOCK_REASONS = {
    "MISSING_DATA": "Part number or manufacturer data is missing.",
    "AMBIGUOUS": "Ambiguous manufacturer identity. Manual review required.",
    "REQUIRES_MPN_MAPPING": "A verified IPN → MPN mapping is required before lifecycle lookup.",
    "REQUIRES_MANUFACTURER_REVIEW": "Manufacturer requires manual review before lifecycle lookup.",
}


class LifecycleService:
    def __init__(
        self,
        provider: LifecycleProvider,
        identity_resolver: IdentityResolver,
        secondary_provider: Optional[LifecycleProvider] = None,
    ):
        self.provider = provider
        self.identity_resolver = identity_resolver
        self.secondary_provider = secondary_provider

    def _block_reason(self, identity: ResolvedPartIdentity) -> str:
        """Derives a human-readable block reason from the identity resolution status."""
        return _BLOCK_REASONS.get(
            identity.resolution_status,
            f"Identity not resolved (status: {identity.resolution_status})."
        )

    async def lookup_identity(self, identity: ResolvedPartIdentity, db: AsyncSession = None) -> dict:
        """
        Enforces the gatekeeper check before calling the external provider.
        Returns a dict representing the operation status, execution type, and retrieved data.
        """
        # 1. GATEKEEPER CHECK: This is non-negotiable.
        allowed = self.identity_resolver.can_lookup_lifecycle(identity)

        if not allowed:
            return {
                "lookup_status": "BLOCKED",
                "reason": self._block_reason(identity),
                "lifecycle_data": None,
                "execution_type": "BLOCKED_BY_GATEKEEPER"
            }

        # 1.5 Database-First Lookup (Real Data)
        if db:
            record_query = await db.execute(
                select(PartIdentityLifecycle).where(
                    PartIdentityLifecycle.internal_part_number == identity.original_part_number
                )
            )
            record = record_query.scalars().first()
            if record and record.provider == "nexar" and record.lookup_status == "SUCCESS" and record.verification_status == "VERIFIED" and record.match_type in ("EXACT_MATCH", "VERIFIED_ALIAS"):
                # We have a real, persisted Nexar record. Return it!
                return {
                    "lookup_status": "SUCCESS",
                    "reason": None,
                    "lifecycle_data": LifecycleData(
                        manufacturer=record.manufacturer,
                        manufacturer_part_number=record.manufacturer_part_number,
                        lifecycle_status=record.lifecycle_status,
                        product_status=record.product_status,
                        is_obsolete=record.is_obsolete,
                        is_discontinued=record.is_discontinued,
                        end_of_life_date=record.end_of_life_date,
                        availability_status=record.availability_status,
                        source=record.provider,
                        retrieved_at=record.retrieved_at
                    ),
                    "execution_type": "DATABASE_HIT"
                }

            # If identity is VERIFIED but we have no real Nexar record,
            # in MOCK mode we must NOT fall back to generating synthetic mock data.
            # In NEXAR mode, we proceed to lookup with Nexar.
            mapping_query = await db.execute(
                select(PartNumberMapping).where(
                    PartNumberMapping.internal_part_number == identity.original_part_number
                )
            )
            mapping = mapping_query.scalars().first()
            if mapping and mapping.verification_status == "VERIFIED":
                if self.provider.source_name.lower() != "nexar":
                    return {
                        "lookup_status": "NOT_AVAILABLE",
                        "reason": "Real Nexar lifecycle data is unavailable for this verified identity.",
                        "lifecycle_data": None,
                        "execution_type": "NOT_AVAILABLE_IN_DB"
                    }

        # 2. Primary Provider Lookup
        primary_data = None
        primary_error = None
        try:
            primary_data = await self.provider.lookup(
                manufacturer=identity.manufacturer_canonical,
                manufacturer_part_number=identity.manufacturer_part_number
            )
        except Exception as e:
            primary_error = e

        if primary_data:
            exec_type = "ACTUAL_NEXAR_REQUEST" if self.provider.source_name.lower() == "nexar" else "MOCK_RESULT"
            return {
                "lookup_status": "SUCCESS",
                "reason": None,
                "lifecycle_data": primary_data,
                "execution_type": exec_type
            }

        # If primary provider failed due to an exception (auth, quota, rate-limit, network error):
        # A secondary provider may ONLY be considered after a genuine no-match,
        # NEVER after authentication, quota, rate-limit, or server errors.
        if primary_error is not None:
            return {
                "lookup_status": "FAILED",
                "reason": str(primary_error),
                "lifecycle_data": None,
                "execution_type": "FAILED"
            }

        # 3. Fallback to Secondary Provider (only on genuine NO_MATCH from primary)
        if self.secondary_provider:
            try:
                secondary_data = await self.secondary_provider.lookup(
                    manufacturer=identity.manufacturer_canonical,
                    manufacturer_part_number=identity.manufacturer_part_number
                )
                if secondary_data:
                    return {
                        "lookup_status": "SUCCESS",
                        "reason": None,
                        "lifecycle_data": secondary_data,
                        "execution_type": "SECONDARY_PROVIDER"
                    }
                else:
                    return {
                        "lookup_status": "FAILED",
                        "reason": f"No data returned by primary ({self.provider.source_name}) or secondary ({self.secondary_provider.source_name}) provider.",
                        "lifecycle_data": None,
                        "execution_type": "FAILED"
                    }
            except Exception as e:
                return {
                    "lookup_status": "FAILED",
                    "reason": f"Secondary provider ({self.secondary_provider.source_name}) error: {str(e)}",
                    "lifecycle_data": None,
                    "execution_type": "FAILED"
                }

        return {
            "lookup_status": "FAILED",
            "reason": "Provider returned no data.",
            "lifecycle_data": None,
            "execution_type": "FAILED"
        }

    async def process_bom_lifecycle(self, bom_id: str, db: AsyncSession) -> dict:
        """
        Batch processing function to resolve and fetch lifecycle for all items in a BOM.
        Persists results to PartIdentityLifecycle.
        Returns a detailed diagnostic summary distinguishing database hits, blocked
        identities, mock results, and actual Nexar requests.
        """
        # Get BOM Items
        result = await db.execute(select(BOMItem).where(BOMItem.bom_id == bom_id))
        bom_items = result.scalars().all()

        # Collect distinct (original_part_number, original_manufacturer) pairs
        seen = set()
        unique_items = []
        for item in bom_items:
            if not item.original_part_number:
                continue
            key = (str(item.original_part_number).strip(), str(item.original_manufacturer or "").strip())
            if key not in seen:
                seen.add(key)
                unique_items.append(item)

        database_hits = 0
        blocked_identities = 0
        mock_results = 0
        actual_nexar_requests = 0
        failed_requests = 0
        details = []

        for item in unique_items:
            ipn = str(item.original_part_number).strip()
            raw_mfr = str(item.original_manufacturer or "").strip()

            # Resolve identity using existing resolver
            identity = await self.identity_resolver.resolve(ipn, raw_mfr, db)

            # Perform Gatekeeper and Lookup
            lookup_result = await self.lookup_identity(identity, db)
            status = lookup_result["lookup_status"]
            reason = lookup_result.get("reason")
            data: Optional[LifecycleData] = lookup_result.get("lifecycle_data")
            exec_type = lookup_result.get("execution_type", "UNKNOWN")

            if exec_type == "DATABASE_HIT":
                database_hits += 1
            elif exec_type == "BLOCKED_BY_GATEKEEPER":
                blocked_identities += 1
            elif exec_type == "MOCK_RESULT":
                mock_results += 1
            elif exec_type == "ACTUAL_NEXAR_REQUEST":
                actual_nexar_requests += 1
            else:
                failed_requests += 1

            details.append({
                "part_number": ipn,
                "manufacturer": raw_mfr,
                "lookup_status": status,
                "execution_type": exec_type,
                "reason": reason
            })

            # Check if PartIdentityLifecycle record already exists for this IPN
            record_query = await db.execute(
                select(PartIdentityLifecycle).where(
                    PartIdentityLifecycle.internal_part_number == ipn
                )
            )
            record = record_query.scalars().first()

            if not record:
                record = PartIdentityLifecycle(internal_part_number=ipn)
                db.add(record)

            record.lookup_status = status
            record.error_reason = reason

            if data:
                # Do not overwrite real provider records with Mock data
                has_real_provider = (record.provider and record.provider.upper() not in ("MOCK", ""))
                if has_real_provider and data.source.upper() == "MOCK":
                    pass # Safeguard: protect existing real provider data
                else:
                    record.manufacturer = data.manufacturer
                    record.manufacturer_part_number = data.manufacturer_part_number
                    record.lifecycle_status = data.lifecycle_status
                    record.product_status = data.product_status
                    record.is_obsolete = data.is_obsolete
                    record.is_discontinued = data.is_discontinued
                    record.end_of_life_date = data.end_of_life_date
                    record.availability_status = data.availability_status
                    record.provider = data.source
                    record.retrieved_at = data.retrieved_at
                    if data.source.lower() == "nexar":
                        record.verification_status = "VERIFIED"
                        record.match_type = "EXACT_MATCH"
            else:
                # Clear fields if NOT_AVAILABLE
                if status == "NOT_AVAILABLE":
                    record.lifecycle_status = None
                    record.product_status = None
                    record.is_obsolete = None
                    record.is_discontinued = None
                    record.end_of_life_date = None
                    record.availability_status = None

            record.updated_at = datetime.utcnow()

        await db.commit()

        return {
            "status": "success",
            "bom_id": bom_id,
            "provider": self.provider.source_name,
            "summary": {
                "total_items": len(bom_items),
                "unique_parts": len(unique_items),
                "database_hits": database_hits,
                "blocked_identities": blocked_identities,
                "mock_results": mock_results,
                "actual_nexar_requests": actual_nexar_requests,
                "failed_requests": failed_requests,
            },
            "details": details
        }
