import httpx
import logging
import asyncio
import re
from typing import Optional, Dict, Any, Tuple, List
from enum import Enum
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# Constants
NEXAR_AUTH_URL = "https://identity.nexar.com/connect/token"
NEXAR_GRAPHQL_URL = "https://api.nexar.com/graphql"

class NormalizedLifecycle(str, Enum):
    ACTIVE = "ACTIVE"
    NRND = "NRND"
    EOL = "EOL"
    OBSOLETE = "OBSOLETE"
    UNKNOWN = "UNKNOWN"

class MatchClassification(str, Enum):
    EXACT_MATCH = "EXACT_MATCH"
    VERIFIED_ALIAS = "VERIFIED_ALIAS"
    CLOSE_MATCH = "CLOSE_MATCH"
    NO_MATCH = "NO_MATCH"

class NexarLifecycleData(BaseModel):
    # ── What was requested ───────────────────────────────────
    requested_mpn: str
    requested_manufacturer: Optional[str] = None

    # ── What Nexar returned ──────────────────────────────────
    manufacturer: str
    mpn: str
    nexar_part_id: Optional[str] = None

    # ── Lifecycle ────────────────────────────────────────────
    raw_status: str
    normalized_status: NormalizedLifecycle
    eol_date: Optional[str] = None
    ltb_date: Optional[str] = None
    last_ship_date: Optional[str] = None

    # ── Match & Provenance ───────────────────────────────────
    match_classification: MatchClassification
    provider: str = "nexar"
    source_url: Optional[str] = None
    confidence_score: Optional[float] = None
    raw_response: Optional[str] = None        # Full JSON for audit trail

class NexarClientError(Exception):
    pass

class NexarClient:
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or settings.NEXAR_CLIENT_ID
        self.client_secret = client_secret or settings.NEXAR_CLIENT_SECRET
        self.access_token: Optional[str] = None

    def _check_credentials(self):
        if not self.client_id:
            raise NexarClientError("Missing Client ID (NEXAR_CLIENT_ID is not set).")
        if not self.client_secret:
            raise NexarClientError("Missing Client Secret (NEXAR_CLIENT_SECRET is not set).")

    async def authenticate(self) -> str:
        """Obtain an OAuth2 access token."""
        self._check_credentials()
        
        auth_data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(NEXAR_AUTH_URL, data=auth_data)
                
                if response.status_code != 200:
                    if response.status_code == 400:
                        raise NexarClientError("Invalid credentials provided to Nexar.")
                    raise NexarClientError(f"Authentication failed: {response.text}")
                
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                return self.access_token
            except httpx.RequestError as e:
                raise NexarClientError(f"Network error during authentication: {str(e)}")

    def _normalize_status(self, raw_status: str) -> NormalizedLifecycle:
        """Map raw Nexar statuses to standardized internal format."""
        if not raw_status:
            return NormalizedLifecycle.UNKNOWN
            
        status = raw_status.strip().lower()
        
        # Check for keywords within the status string to handle extra metadata
        if "nrnd" in status or "not recommended" in status:
            return NormalizedLifecycle.NRND
        elif "eol" in status or "end of life" in status:
            return NormalizedLifecycle.EOL
        elif "obsolete" in status or "discontinued" in status:
            return NormalizedLifecycle.OBSOLETE
        elif "production" in status or "new" in status or "active" in status:
            return NormalizedLifecycle.ACTIVE
        else:
            return NormalizedLifecycle.UNKNOWN
            
    def _safe_normalize_mpn(self, mpn: str) -> str:
        """Normalize MPN for safe comparison (alphanumeric only, uppercase)."""
        if not mpn:
            return ""
        # Keep letters and numbers only to avoid matching issues with hyphens
        # But we DO NOT strip suffixes.
        normalized = re.sub(r'[^A-Z0-9]', '', mpn.upper())
        return normalized

    def _evaluate_match(self, req_mfr: Optional[str], req_mpn: str, res_mfr: str, res_mpn: str, verified_aliases: Optional[List[Dict[str, str]]] = None) -> MatchClassification:
        req_mpn_norm = self._safe_normalize_mpn(req_mpn)
        res_mpn_norm = self._safe_normalize_mpn(res_mpn)
        
        if req_mpn_norm == res_mpn_norm:
            # If manufacturer is provided, check if it matches at least partially
            if req_mfr:
                req_mfr_norm = self._safe_normalize_mpn(req_mfr)
                res_mfr_norm = self._safe_normalize_mpn(res_mfr)
                if req_mfr_norm in res_mfr_norm or res_mfr_norm in req_mfr_norm:
                    return MatchClassification.EXACT_MATCH
                else:
                    return MatchClassification.CLOSE_MATCH # Mfr mismatch
            return MatchClassification.EXACT_MATCH
            
        # Check verified aliases if not an exact match
        if verified_aliases and req_mfr:
            req_mfr_norm = self._safe_normalize_mpn(req_mfr)
            res_mfr_norm = self._safe_normalize_mpn(res_mfr)
            for alias in verified_aliases:
                alias_req_mpn = self._safe_normalize_mpn(alias["requested_mpn"])
                alias_res_mpn = self._safe_normalize_mpn(alias["returned_mpn"])
                alias_req_mfr = self._safe_normalize_mpn(alias["requested_manufacturer"])
                alias_res_mfr = self._safe_normalize_mpn(alias["returned_manufacturer"])
                
                # Check if this result matches the alias criteria
                if req_mpn_norm == alias_req_mpn and \
                   (req_mfr_norm in alias_req_mfr or alias_req_mfr in req_mfr_norm) and \
                   res_mpn_norm == alias_res_mpn and \
                   (res_mfr_norm in alias_res_mfr or alias_res_mfr in res_mfr_norm):
                    return MatchClassification.VERIFIED_ALIAS

        if req_mpn_norm in res_mpn_norm or res_mpn_norm in req_mpn_norm:
            return MatchClassification.CLOSE_MATCH
            
        return MatchClassification.NO_MATCH

    async def get_lifecycle(self, mpn: str, manufacturer: Optional[str] = None, verified_aliases: Optional[List[Dict[str, str]]] = None) -> Optional[NexarLifecycleData]:
        """Fetch lifecycle information for a given MPN, evaluating match quality."""
        if not self.access_token:
            await self.authenticate()
            
        # Request up to 5 results to increase chances of finding exact match
        query = """
        query GetLifecycle($mpn: String!) {
            supSearchMpn(q: $mpn, limit: 5) {
                results {
                    part {
                        id
                        mpn
                        manufacturer {
                            name
                        }
                        specs {
                            attribute {
                                shortname
                            }
                            displayValue
                        }
                    }
                }
            }
        }
        """
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "query": query,
            "variables": {"mpn": mpn}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(NEXAR_GRAPHQL_URL, json=payload, headers=headers)
                
                if response.status_code == 401:
                    logger.info("Nexar access token expired or invalid (HTTP 401). Refreshing token and retrying once...")
                    self.access_token = None
                    await self.authenticate()
                    headers["Authorization"] = f"Bearer {self.access_token}"
                    response = await client.post(NEXAR_GRAPHQL_URL, json=payload, headers=headers)
                    if response.status_code == 401:
                        raise NexarClientError("Access token expired or invalid after authentication retry.")

                if response.status_code == 429:
                    raise NexarClientError("Rate limit exceeded.")
                elif response.status_code != 200:
                    raise NexarClientError(f"API request failed with status {response.status_code}: {response.text}")
                
                data = response.json()
                
                if "errors" in data:
                    raise NexarClientError(f"GraphQL errors: {data['errors']}")
                
                results = data.get("data", {}).get("supSearchMpn", {}).get("results", [])
                
                if not results:
                    return None # No matching part found
                
                best_part_data = None
                best_classification = MatchClassification.NO_MATCH
                
                # Evaluate results to find the best match
                for result in results:
                    part_data = result.get("part", {})
                    if not part_data:
                        continue
                        
                    res_mfr = part_data.get("manufacturer", {}).get("name", "")
                    res_mpn = part_data.get("mpn", "")
                    
                    classification = self._evaluate_match(manufacturer, mpn, res_mfr, res_mpn, verified_aliases)
                    
                    if classification in (MatchClassification.EXACT_MATCH, MatchClassification.VERIFIED_ALIAS):
                        best_part_data = part_data
                        best_classification = classification
                        break # Found best possible
                    elif classification == MatchClassification.CLOSE_MATCH and best_classification == MatchClassification.NO_MATCH:
                        best_part_data = part_data
                        best_classification = classification
                
                if not best_part_data:
                    # If we didn't find any exact or close match, just take the first one but mark it NO_MATCH
                    best_part_data = results[0].get("part", {})
                    best_classification = MatchClassification.NO_MATCH
                
                # Extract fields
                returned_mfr = best_part_data.get("manufacturer", {}).get("name", "Unknown")
                returned_mpn = best_part_data.get("mpn", "")
                part_id = best_part_data.get("id")
                
                # Parse specs for lifecycle
                raw_status = "Unknown"
                eol_date = None
                ltb_date = None
                last_ship_date = None
                
                for spec in best_part_data.get("specs", []):
                    attr_name = spec.get("attribute", {}).get("shortname", "").lower()
                    val = spec.get("displayValue")
                    
                    if attr_name == "lifecyclestatus":
                        raw_status = val
                    elif attr_name in ("eoldate", "endoflife"):
                        eol_date = val
                    elif attr_name in ("lasttimebuy", "ltbdate"):
                        ltb_date = val
                    elif attr_name in ("lastshipdate",):
                        last_ship_date = val

                # Build confidence score based on match quality
                confidence = None
                if best_classification == MatchClassification.EXACT_MATCH:
                    confidence = 1.0
                elif best_classification == MatchClassification.VERIFIED_ALIAS:
                    confidence = 0.95
                elif best_classification == MatchClassification.CLOSE_MATCH:
                    confidence = 0.6
                elif best_classification == MatchClassification.NO_MATCH:
                    confidence = 0.1

                # Store raw response for audit trail (serialize the best part data)
                import json
                raw_response_str = json.dumps(best_part_data)

                # Build source URL from Nexar part ID
                source_url = f"https://octopart.com/search?q={returned_mpn}" if returned_mpn else None

                return NexarLifecycleData(
                    requested_mpn=mpn,
                    requested_manufacturer=manufacturer,
                    manufacturer=returned_mfr,
                    mpn=returned_mpn,
                    nexar_part_id=part_id,
                    raw_status=raw_status,
                    normalized_status=self._normalize_status(raw_status),
                    eol_date=eol_date,
                    ltb_date=ltb_date,
                    last_ship_date=last_ship_date,
                    match_classification=best_classification,
                    provider="nexar",
                    source_url=source_url,
                    confidence_score=confidence,
                    raw_response=raw_response_str
                )
                
            except httpx.RequestError as e:
                raise NexarClientError(f"Network error during API call: {str(e)}")

