from abc import ABC, abstractmethod
from typing import Optional
from .models import LifecycleData

class LifecycleProvider(ABC):
    """
    Abstract interface for retrieving lifecycle data from external sources.
    Keeps the risk engine provider-agnostic.
    """
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        """Name of the provider (e.g. 'MOCK', 'INTERNAL')"""
        pass

    @abstractmethod
    async def lookup(self, manufacturer: str, manufacturer_part_number: str) -> Optional[LifecycleData]:
        """
        Retrieves lifecycle data for a given manufacturer and MPN.
        Should return None if the part is entirely unknown to the provider, 
        or raise an exception if a network error occurs.
        """
        pass
