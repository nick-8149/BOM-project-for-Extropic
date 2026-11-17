from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class ManufacturerMapping:
    raw_name: str
    canonical_name: str
    mapping_status: str # CONFIRMED_ALIAS, POSSIBLE_ALIAS, DISTINCT, UNKNOWN
    confidence: float
    reason: str

class ManufacturerCanonicalizer:
    
    # In a real industrial system, this would be backed by a database table.
    # We use an in-memory dictionary for this Step 7 proof of concept.
    KNOWN_ALIASES = {
        "on semiconductor (motorola)": ManufacturerMapping(
            raw_name="ON Semiconductor (Motorola)",
            canonical_name="ON Semiconductor / onsemi",
            mapping_status="CONFIRMED_ALIAS",
            confidence=1.0,
            reason="Historical acquisition/rebranding"
        ),
        "texas instruments (nsc)": ManufacturerMapping(
            raw_name="TEXAS INSTRUMENTS (NSC)",
            canonical_name="Texas Instruments",
            mapping_status="CONFIRMED_ALIAS",
            confidence=1.0,
            reason="National Semiconductor acquired by TI"
        ),
        "ferrenti semicoductor(zetex)": ManufacturerMapping(
            raw_name="FERRENTI SEMICODUCTOR(ZETEX)",
            canonical_name="Zetex / Diodes Inc.",
            mapping_status="POSSIBLE_ALIAS",
            confidence=0.7,
            reason="Complex acquisition chain, requires review"
        ),
        "draloric (vishay)": ManufacturerMapping(
            raw_name="DRALORIC (VISHAY)",
            canonical_name="Vishay",
            mapping_status="CONFIRMED_ALIAS",
            confidence=1.0,
            reason="Subsidiary clearly identified"
        )
    }

    @classmethod
    def canonicalize(cls, parsed_name: str) -> ManufacturerMapping:
        """Takes a single parsed manufacturer string and returns its mapping info."""
        if not parsed_name:
            return ManufacturerMapping("", "", "UNKNOWN", 0.0, "Empty input")
            
        search_key = parsed_name.lower().strip()
        
        # Exact match in known aliases
        if search_key in cls.KNOWN_ALIASES:
            return cls.KNOWN_ALIASES[search_key]
            
        # If no alias found, treat as DISTINCT (it's its own canonical name)
        return ManufacturerMapping(
            raw_name=parsed_name,
            canonical_name=parsed_name,
            mapping_status="DISTINCT",
            confidence=0.9,
            reason="No known aliases, using raw string"
        )
