from datetime import datetime
from typing import Optional, List, Dict
import logging

from .provider import LifecycleProvider
from .models import LifecycleData
from .nexar_client import (
    NexarClient,
    NexarLifecycleData,
    NormalizedLifecycle,
    MatchClassification,
    NexarClientError,
)

logger = logging.getLogger(__name__)


class NexarLifecycleProvider(LifecycleProvider):
    """
    Adapter implementing the LifecycleProvider interface by delegating
    to an underlying NexarClient.

    Preserves strict matching:
    - Only EXACT_MATCH and VERIFIED_ALIAS qualify for LifecycleData.
    - CLOSE_MATCH (fuzzy/suffix/variant) and NO_MATCH are rejected (returns None).
    - Preserves provider provenance ('nexar').
    """

    def __init__(
        self,
        client: Optional[NexarClient] = None,
        verified_aliases: Optional[List[Dict[str, str]]] = None,
    ):
        self._client = client or NexarClient()
        self._verified_aliases = verified_aliases or []

    @property
    def source_name(self) -> str:
        return "nexar"

    @property
    def client(self) -> NexarClient:
        return self._client

    def set_verified_aliases(self, aliases: List[Dict[str, str]]) -> None:
        """Update the list of verified aliases accepted for match resolution."""
        self._verified_aliases = aliases or []

    async def lookup(
        self,
        manufacturer: str,
        manufacturer_part_number: str,
        verified_aliases: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[LifecycleData]:
        """
        Retrieves lifecycle data for a given manufacturer and MPN using NexarClient.
        Returns LifecycleData if an exact match or verified alias is found.
        Returns None if no match or only a close/unverified match is found.
        Raises NexarClientError on communication/auth/rate-limit failures.
        """
        aliases = verified_aliases if verified_aliases is not None else self._verified_aliases

        # Delegate to existing client
        nexar_data: Optional[NexarLifecycleData] = await self._client.get_lifecycle(
            mpn=manufacturer_part_number,
            manufacturer=manufacturer,
            verified_aliases=aliases,
        )

        if not nexar_data:
            return None

        # CRITICAL SAFETY: Only EXACT_MATCH or VERIFIED_ALIAS are accepted.
        # Close matches (fuzzy MPN, packaging variants without verified alias,
        # qualification variants like LM124AWG -> LM124AWGRQMLV) MUST be rejected.
        if nexar_data.match_classification not in (
            MatchClassification.EXACT_MATCH,
            MatchClassification.VERIFIED_ALIAS,
        ):
            logger.info(
                f"NexarLifecycleProvider: rejected match classification "
                f"'{nexar_data.match_classification}' for MPN '{manufacturer_part_number}'"
            )
            return None

        # Parse EOL date if present
        eol_datetime = None
        if nexar_data.eol_date:
            try:
                eol_datetime = datetime.fromisoformat(nexar_data.eol_date)
            except (ValueError, TypeError):
                try:
                    eol_datetime = datetime.strptime(nexar_data.eol_date, "%Y-%m-%d")
                except (ValueError, TypeError):
                    eol_datetime = None

        is_obsolete = None
        is_discontinued = None
        if nexar_data.normalized_status == NormalizedLifecycle.OBSOLETE:
            is_obsolete = True
            is_discontinued = True
        elif nexar_data.normalized_status == NormalizedLifecycle.EOL:
            is_obsolete = False
            is_discontinued = True
        elif nexar_data.normalized_status in (
            NormalizedLifecycle.ACTIVE,
            NormalizedLifecycle.NRND,
        ):
            is_obsolete = False
            is_discontinued = False

        return LifecycleData(
            manufacturer=nexar_data.manufacturer,
            manufacturer_part_number=nexar_data.mpn,
            lifecycle_status=nexar_data.normalized_status.value,
            product_status=nexar_data.raw_status,
            is_obsolete=is_obsolete,
            is_discontinued=is_discontinued,
            end_of_life_date=eol_datetime,
            availability_status=None,
            source=self.source_name,
            retrieved_at=datetime.utcnow(),
        )
