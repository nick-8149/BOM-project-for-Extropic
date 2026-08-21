"""
Application configuration using Pydantic Settings.

Loads values from environment variables / .env file.
All thresholds are configurable so they can be calibrated
against actual BOM data later (per requirements).
"""

from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    """Central configuration for the BOM Manager application."""

    # ── Application ──────────────────────────────────────────
    APP_NAME: str = "BOM Verification cum Obsolescence Manager"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./bom_manager.db"

    # ── Authentication ───────────────────────────────────────
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # ── CORS ─────────────────────────────────────────────────
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:5173"]

    # ── File Upload ──────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Matching Thresholds ──────────────────────────────────
    # These are configurable so they can be calibrated with
    # actual BOM data. Values are percentages (0-100).
    FUZZY_MATCH_THRESHOLD: int = 75
    HIGH_CONFIDENCE_THRESHOLD: int = 90
    MEDIUM_CONFIDENCE_THRESHOLD: int = 70
    LOW_CONFIDENCE_THRESHOLD: int = 50

    # ── EOL Alert ────────────────────────────────────────────
    EOL_ALERT_THRESHOLD_YEARS: int = 2

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton instance
settings = Settings()
