from typing import Dict, List, Optional, Callable
import logging

from .provider import LifecycleProvider
from .mock_provider import MockLifecycleProvider

logger = logging.getLogger(__name__)


class UnknownProviderError(Exception):
    """Raised when an unrecognized provider name is requested."""
    pass


class ProviderNotConfiguredError(Exception):
    """Raised when a recognized provider is requested but lacks required configuration or credentials."""
    pass


class LifecycleProviderRegistry:
    """
    Registry for managing and retrieving configured LifecycleProvider implementations.

    Guarantees:
    - Explicit provider naming (e.g. 'mock', 'nexar').
    - Unknown provider names raise UnknownProviderError.
    - Unconfigured providers raise ProviderNotConfiguredError.
    - No credentials are hardcoded.
    - No silent fallback to mock on provider failure.
    """

    def __init__(self):
        self._providers: Dict[str, LifecycleProvider] = {}
        self._factories: Dict[str, Callable[[], LifecycleProvider]] = {}
        self._default_provider_name: str = "mock"

        # Register default mock provider
        self.register_provider("mock", MockLifecycleProvider())

        # Register lazy factory for Nexar
        self.register_factory("nexar", self._create_nexar_provider)

    def _create_nexar_provider(self) -> LifecycleProvider:
        from app.config import settings
        from .nexar_client import NexarClient
        from .nexar_provider import NexarLifecycleProvider

        if not settings.NEXAR_CLIENT_ID or not settings.NEXAR_CLIENT_SECRET:
            raise ProviderNotConfiguredError(
                "Nexar provider credentials (NEXAR_CLIENT_ID / NEXAR_CLIENT_SECRET) are not configured."
            )
        return NexarLifecycleProvider(client=NexarClient())

    def register_provider(self, name: str, provider: LifecycleProvider) -> None:
        key = name.lower().strip()
        self._providers[key] = provider

    def register_factory(self, name: str, factory: Callable[[], LifecycleProvider]) -> None:
        key = name.lower().strip()
        self._factories[key] = factory

    def unregister(self, name: str) -> None:
        key = name.lower().strip()
        self._providers.pop(key, None)
        self._factories.pop(key, None)

    def get_provider(self, name: str) -> LifecycleProvider:
        key = name.lower().strip()
        if key in self._providers:
            return self._providers[key]
        if key in self._factories:
            provider = self._factories[key]()
            self._providers[key] = provider
            return provider

        # Known secondary providers that are not yet implemented / configured
        if key in ("z2data", "siliconexpert"):
            raise ProviderNotConfiguredError(
                f"Secondary provider '{name}' is not configured. Missing official credentials and API implementation."
            )

        known = self.list_known_providers()
        raise UnknownProviderError(
            f"Unknown lifecycle provider: '{name}'. Available/known providers: {known}"
        )

    def list_providers(self) -> List[str]:
        """List currently registered provider instances."""
        return sorted(list(self._providers.keys()))

    def list_known_providers(self) -> List[str]:
        """List all registered providers, factories, and known placeholders."""
        all_known = set(self._providers.keys()) | set(self._factories.keys()) | {"z2data", "siliconexpert"}
        return sorted(list(all_known))

    def set_default_provider(self, name: str) -> None:
        key = name.lower().strip()
        if key not in self._providers and key not in self._factories:
            raise UnknownProviderError(f"Cannot set unknown provider '{name}' as default.")
        self._default_provider_name = key

    def get_default_provider(self) -> LifecycleProvider:
        from app.config import settings
        env_provider = getattr(settings, "LIFECYCLE_PROVIDER", None)
        target = env_provider.lower().strip() if env_provider else self._default_provider_name
        return self.get_provider(target)


# Global singleton registry instance
provider_registry = LifecycleProviderRegistry()
