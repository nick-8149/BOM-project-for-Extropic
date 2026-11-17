import re
from typing import List

class ManufacturerParser:
    """Safely parses complex, potentially concatenated manufacturer strings."""
    
    @staticmethod
    def parse(raw_string: str) -> List[str]:
        if not raw_string or not str(raw_string).strip():
            return []
            
        raw = str(raw_string).strip()
        
        # Remove leading/trailing stray commas first to prevent empty string matches
        if raw.startswith(","):
            raw = raw[1:].strip()
        if raw.endswith(","):
            raw = raw[:-1].strip()
            
        if not raw:
            return []
            
        # We need to split by comma, BUT NOT if the comma is inside parentheses.
        # Example: "YAGEO CORP(TAIWAN, REPUBLIC OF CHINA),VISHAY"
        # Strategy: keep track of parenthesis depth.
        
        result = []
        current_mfr = []
        depth = 0
        
        for char in raw:
            if char == '(':
                depth += 1
                current_mfr.append(char)
            elif char == ')':
                depth = max(0, depth - 1)
                current_mfr.append(char)
            elif char == ',' and depth == 0:
                # Safe to split
                mfr = "".join(current_mfr).strip()
                if mfr:
                    result.append(mfr)
                current_mfr = []
            else:
                current_mfr.append(char)
                
        # Append the last one
        mfr = "".join(current_mfr).strip()
        if mfr:
            result.append(mfr)
            
        return result
