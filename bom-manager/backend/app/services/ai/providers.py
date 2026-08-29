"""
AI Provider abstraction layer.

Supports switching between LLM providers via the AI_PROVIDER config setting.
Currently implements Google Gemini; OpenAI and Ollama are stubs for future use.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def generate_structured(self, prompt: str) -> dict:
        """
        Send a prompt to the AI and return a parsed JSON dict.
        Raises AIProviderError on failure.
        """
        ...

    @abstractmethod
    async def generate_text(self, prompt: str) -> str:
        """
        Send a prompt and return a plain-text response.
        Used for the explanation chat.
        """
        ...


class AIProviderError(Exception):
    """Raised when an AI provider call fails."""
    pass


class GeminiProvider(AIProvider):
    """Google Gemini AI provider using google-generativeai SDK."""

    def __init__(self):
        if not settings.AI_API_KEY:
            raise AIProviderError(
                "AI_API_KEY is not configured. Set it in your .env file."
            )
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.AI_API_KEY)
            self._model = genai.GenerativeModel(settings.AI_MODEL)
        except ImportError:
            raise AIProviderError(
                "google-generativeai package is not installed. "
                "Run: pip install google-generativeai"
            )
        except Exception as e:
            raise AIProviderError(f"Failed to initialize Gemini provider: {e}")

    async def generate_structured(self, prompt: str) -> dict:
        """Call Gemini and parse the JSON response."""
        try:
            response = await self._model.generate_content_async(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.2,  # Low temp for consistent structured output
                    "max_output_tokens": 4096,
                },
            )

            if not response.text:
                raise AIProviderError("Gemini returned an empty response.")

            # Parse JSON from response
            text = response.text.strip()
            # Remove markdown code fences if present
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()

            return json.loads(text)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}")
            raise AIProviderError(f"AI returned malformed JSON: {e}")
        except AIProviderError:
            raise
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise AIProviderError(f"AI provider unavailable: {e}")

    async def generate_text(self, prompt: str) -> str:
        """Call Gemini and return plain text."""
        try:
            response = await self._model.generate_content_async(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                },
            )

            if not response.text:
                raise AIProviderError("Gemini returned an empty response.")

            return response.text.strip()

        except AIProviderError:
            raise
        except Exception as e:
            logger.error(f"Gemini text generation failed: {e}")
            raise AIProviderError(f"AI provider unavailable: {e}")


class OpenAIProvider(AIProvider):
    """OpenAI provider stub — implement when needed."""

    async def generate_structured(self, prompt: str) -> dict:
        raise AIProviderError("OpenAI provider is not yet implemented.")

    async def generate_text(self, prompt: str) -> str:
        raise AIProviderError("OpenAI provider is not yet implemented.")


class OllamaProvider(AIProvider):
    """Ollama (local) provider stub — implement when needed."""

    async def generate_structured(self, prompt: str) -> dict:
        raise AIProviderError("Ollama provider is not yet implemented.")

    async def generate_text(self, prompt: str) -> str:
        raise AIProviderError("Ollama provider is not yet implemented.")


def get_ai_provider() -> AIProvider:
    """Factory function returning the configured AI provider instance."""
    provider_name = settings.AI_PROVIDER.lower()

    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "openai":
        return OpenAIProvider()
    elif provider_name == "ollama":
        return OllamaProvider()
    else:
        raise AIProviderError(
            f"Unknown AI provider: '{provider_name}'. "
            f"Supported: gemini, openai, ollama"
        )
