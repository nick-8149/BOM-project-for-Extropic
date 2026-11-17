"""
Lifecycle package handling normalized retrieval of lifecycle and obsolescence data 
via a provider-independent interface. 
Enforces IdentityResolution gatekeeping constraints.
"""

from .provider import LifecycleProvider
from .models import LifecycleData
from .mock_provider import MockLifecycleProvider
from .nexar_provider import NexarLifecycleProvider
from .registry import (
    LifecycleProviderRegistry,
    provider_registry,
    UnknownProviderError,
    ProviderNotConfiguredError,
)
from .service import LifecycleService

__all__ = [
    "LifecycleProvider",
    "LifecycleData",
    "MockLifecycleProvider",
    "NexarLifecycleProvider",
    "LifecycleProviderRegistry",
    "provider_registry",
    "UnknownProviderError",
    "ProviderNotConfiguredError",
    "LifecycleService",
]
