import io
import pandas as pd
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException, status

REQUIRED_COLUMNS = ["part_number"]

COLUMN_MAPPINGS = {
    # Part Number variations
    "part number": "part_number",
    "mpn": "part_number",
    "mfg part number": "part_number",
    "mfg part #": "part_number",
    "component number": "part_number",
    "manufacturer part number": "part_number",
    "part no": "part_number",
    "part no.": "part_number",
    "p/n": "part_number",
    # Manufacturer variations
    "manufacturer": "manufacturer_name",
    "mfg": "manufacturer_name",
    "manufacturer name": "manufacturer_name",
    "mfg name": "manufacturer_name",
    "mfr": "manufacturer_name",
    # Serial Number (ignored but mapped to prevent confusion)
    "sl. no.": "serial_no",
    "sl no": "serial_no",
    "sl.no.": "serial_no",
    "s.no": "serial_no",
    "sr. no.": "serial_no",
    "#": "serial_no",
    "item": "serial_no",
    "line": "serial_no",
    # Quantity variations
    "qty": "quantity",
    "quantity": "quantity",
    "comp. qty (cun)": "quantity",
    # Description variations
    "description": "part_description",
    "part description": "part_description",
    "object description": "part_description",
    "desc": "part_description",
    # Supplier variations
    "supplier": "supplier_name",
    "supplier name": "supplier_name",
    "supplier name / supplier part number": "supplier_name"
}

def parse_and_validate_bom(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Parses BOM bytes into rows and performs structural validations:
    - Verifies file type extension
    - Matches column headers using flexible mappings
    - Checks for required columns
    - Detects empty values and duplicate rows
    """
    # 1. Validate File Format
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    is_csv = ext == 'csv'
    is_xlsx = ext in ('xlsx', 'xls')
    
    if ext == 'pdf':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF files are not supported. Please convert to Excel (.xlsx) or CSV (.csv) first."
        )
    
    if not (is_csv or is_xlsx):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Only Excel (.xlsx, .xls) and CSV (.csv) are supported."
        )

    # 2. Load File into Pandas
    try:
        if is_csv:
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            # For Excel, load first with no header to inspect rows
            df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None)
            
            # Find the first row that looks like it has part number or column headers
            part_keywords = ["part number", "part_number", "part_no", "part no", "mpn", "part#", "part #", "p/n", "component number", "component no"]
            header_row_index = 0
            
            for idx, row in df_raw.iterrows():
                row_vals = [str(val).strip().lower() for val in row.values if pd.notna(val)]
                # If any cell in this row matches our part number keywords, we treat it as header row
                if any(any(kw in val for kw in part_keywords) for val in row_vals):
                    header_row_index = idx
                    break
            
            # Re-read or slice from the found header row
            if header_row_index > 0:
                # Set the columns to the values in the header row
                headers = df_raw.iloc[header_row_index].tolist()
                # Clean headers to be strings, handle nan
                headers = [str(h).strip() if pd.notna(h) else f"Unnamed: {i}" for i, h in enumerate(headers)]
                
                df = df_raw.iloc[header_row_index + 1:].copy()
                df.columns = headers
                df = df.reset_index(drop=True)
            else:
                # Fallback to standard reading
                df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse tabular data: {str(e)}"
        )

    # 3. Map Header Columns
    # Normalize headers
    raw_columns = df.columns.tolist()
    mapped_columns = {}
    
    # Define keywords/substrings to look for
    part_keywords = ["part number", "part_number", "part_no", "part no", "mpn", "part#", "part #", "p/n", "component number", "component no"]
    mfr_keywords = ["manufacturer", "mfg", "mfr", "make", "brand"]
    qty_keywords = ["qty", "quantity", "count", "q.ty"]
    desc_keywords = ["desc", "description", "part_description", "comment", "remarks"]
    supplier_keywords = ["supplier", "vendor", "distributor"]
    
    for original_col in raw_columns:
        col_lower = str(original_col).strip().lower()
        
        # Check for Part Number match
        if any(kw in col_lower for kw in part_keywords):
            mapped_columns[original_col] = "part_number"
        # Check for Manufacturer match
        elif any(kw in col_lower for kw in mfr_keywords):
            mapped_columns[original_col] = "manufacturer_name"
        # Check for Quantity match
        elif any(kw in col_lower for kw in qty_keywords):
            mapped_columns[original_col] = "quantity"
        # Check for Description match
        elif any(kw in col_lower for kw in desc_keywords):
            mapped_columns[original_col] = "part_description"
        # Check for Supplier match
        elif any(kw in col_lower for kw in supplier_keywords):
            mapped_columns[original_col] = "supplier_name"
            
    df = df.rename(columns=mapped_columns)

    # Ensure required columns exist after mapping
    missing_req = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_req:
        available = ', '.join(df.columns.tolist())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(missing_req)}. Detected columns after mapping: [{available}]"
        )

    # manufacturer_name is optional - fill with empty string if missing
    if "manufacturer_name" not in df.columns:
        df["manufacturer_name"] = ""

    # 4. Fill defaults and sanitize
    if "quantity" in df.columns:
        df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(1.0)
    else:
        df["quantity"] = 1.0
        
    if "part_description" not in df.columns:
        df["part_description"] = ""
    if "supplier_name" not in df.columns:
        df["supplier_name"] = ""

    # Clean text values
    df["part_number"] = df["part_number"].astype(str).str.strip()
    df["manufacturer_name"] = df["manufacturer_name"].astype(str).str.strip()
    df["part_description"] = df["part_description"].fillna("").astype(str).str.strip()
    df["supplier_name"] = df["supplier_name"].fillna("").astype(str).str.strip()

    total_rows = len(df)
    
    # 5. Detect missing values in critical columns
    missing_part_rows = df[df["part_number"] == ""].index.tolist()
    missing_mfr_rows = df[df["manufacturer_name"] == ""].index.tolist()
    
    # Drop rows missing Part Number (cannot proceed with matches)
    df = df[df["part_number"] != ""]

    # 6. Detect Duplicates
    dup_mask = df.duplicated(subset=["part_number", "manufacturer_name"], keep="first")
    duplicate_count = int(dup_mask.sum())
    
    # Convert to records dict list
    records = []
    for idx, row in df.iterrows():
        records.append({
            "serial_number": int(idx + 1),
            "original_part_number": row["part_number"],
            "original_manufacturer": row["manufacturer_name"],
            "original_supplier": row["supplier_name"],
            "original_description": row["part_description"],
            "quantity": float(row["quantity"])
        })
        
    validation_summary = {
        "total_rows": total_rows,
        "valid_rows": len(records),
        "missing_part_numbers": len(missing_part_rows),
        "missing_manufacturer_names": len(missing_mfr_rows),
        "duplicate_rows": duplicate_count
    }
    
    return records, validation_summary
