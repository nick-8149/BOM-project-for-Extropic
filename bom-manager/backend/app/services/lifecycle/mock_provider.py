import asyncio
from datetime import datetime
from typing import Optional
from .models import LifecycleData
from .provider import LifecycleProvider

class MockLifecycleProvider(LifecycleProvider):
    """
    Deterministic mock provider for testing lifecycle integrations
    without making real network requests.
    """
    
    @property
    def source_name(self) -> str:
        return "MOCK"

    async def lookup(self, manufacturer: str, manufacturer_part_number: str) -> Optional[LifecycleData]:
        # Simulate slight latency
        await asyncio.sleep(0.1)

        # Normalize keys for lookup
        mpn = manufacturer_part_number.upper()
        
        # Test fixture data
        fixtures = {
            "RC0603FR-0710KL": {
                "lifecycle_status": "ACTIVE",
                "is_obsolete": False,
                "is_discontinued": False,
                "availability_status": "AVAILABLE"
            },
            "MAX232CPE+": {
                "lifecycle_status": "NRND",
                "is_obsolete": False,
                "is_discontinued": False,
                "availability_status": "LIMITED"
            },
            "OBSOLETE-PART-1": {
                "lifecycle_status": "OBSOLETE",
                "is_obsolete": True,
                "is_discontinued": True,
                "availability_status": "UNAVAILABLE"
            }
        }
        
        if mpn in fixtures:
            data = fixtures[mpn]
            return LifecycleData(
                manufacturer=manufacturer,
                manufacturer_part_number=manufacturer_part_number,
                lifecycle_status=data["lifecycle_status"],
                is_obsolete=data["is_obsolete"],
                is_discontinued=data["is_discontinued"],
                availability_status=data["availability_status"],
                source=self.source_name,
                retrieved_at=datetime.utcnow()
            )
            
        # Default fallback for unknown parts, deterministic
        return LifecycleData(
            manufacturer=manufacturer,
            manufacturer_part_number=manufacturer_part_number,
            lifecycle_status="UNKNOWN",
            is_obsolete=False,
            is_discontinued=False,
            availability_status="UNKNOWN",
            source=self.source_name,
            retrieved_at=datetime.utcnow()
        )
