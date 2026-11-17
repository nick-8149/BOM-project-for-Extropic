import re
from typing import Tuple

class PartClassifier:
    
    # 8-12 digits is the heuristic for an IPN from our analysis
    IPN_PATTERN = re.compile(r'^\d{8,12}$')
    
    # Standard alphanumeric MPN pattern (simplified)
    # Allows letters, numbers, hyphens, slashes, periods
    MPN_PATTERN = re.compile(r'^[A-Z0-9][A-Z0-9\-\/\.]{4,}$', re.IGNORECASE)
    
    @classmethod
    def classify(cls, raw_pn: str) -> str:
        """Classifies a part number string into MPN, IPN, AMBIGUOUS, or MISSING."""
        if not raw_pn or not str(raw_pn).strip():
            return "MISSING"
            
        pn = str(raw_pn).strip()
        
        if cls.IPN_PATTERN.match(pn):
            return "IPN"
            
        if cls.MPN_PATTERN.match(pn):
            return "MPN"
            
        return "AMBIGUOUS"
