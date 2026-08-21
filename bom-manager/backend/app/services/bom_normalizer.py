import re

def normalize_part_number(part_number: str) -> str:
    """
    Standardizes part numbers by:
    1. Converting to uppercase
    2. Stripping leading/trailing whitespace
    3. Removing special punctuation dashes, slashes, spaces
    """
    if not part_number:
        return ""
    # Uppercase and strip
    val = part_number.upper().strip()
    # Remove common non-alphanumeric split characters: dash, slash, backslash, space, underscore
    normalized = re.sub(r'[\s\-_\\/]', '', val)
    return normalized

def normalize_manufacturer_name(mfr_name: str) -> str:
    """
    Normalizes manufacturer names to handle aliases, abbreviations, and case-insensitivity.
    """
    if not mfr_name:
        return ""
    val = mfr_name.lower().strip()
    
    # Common manufacturer aliases
    if "texas" in val or "ti" == val or "instruments" in val:
        return "Texas Instruments"
    if "analog" in val or "adi" == val or "devices" in val:
        return "Analog Devices"
    if "infineon" in val:
        return "Infineon Technologies"
    if "stmicro" in val or "st" == val or "st electronics" in val:
        return "STMicroelectronics"
    if "microchip" in val:
        return "Microchip Technology"
    if "te connectivity" in val or "te" == val:
        return "TE Connectivity"
    if "molex" in val:
        return "Molex"
    if "vishay" in val:
        return "Vishay Intertechnology"
        
    # Return Title Case of stripped name as fallback
    return mfr_name.strip().title()
