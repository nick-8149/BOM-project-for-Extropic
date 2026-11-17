import { apiRequest } from './client';

export interface IdentityResolutionSummary {
  total_rows: number;
  total_mpns: number;
  total_ipns: number;
  resolved: number;
  requires_mpn_mapping: number;
  ambiguous: number;
  missing_data: number;
  requires_manufacturer_review: number;
}

export interface ManufacturerCandidate {
  raw: string;
  canonical: string | null;
  status: "CONFIRMED_ALIAS" | "POSSIBLE_ALIAS" | "DISTINCT";
}

export interface IdentityResolutionRecord {
  id: string;
  internal_part_number: string | null;
  manufacturer_raw: string | null;
  manufacturers: ManufacturerCandidate[];
  part_classification: "IPN" | "MPN" | "UNKNOWN";
  manufacturer_part_number: string | null;
  resolution_status: "RESOLVED" | "REQUIRES_MPN_MAPPING" | "AMBIGUOUS" | "MISSING_DATA" | "REQUIRES_MANUFACTURER_REVIEW";
  verification_status: "DRAFT" | "VERIFIED" | "REJECTED" | null;
  mapping_id: string | null;
  lifecycle_lookup_allowed: boolean;
  lifecycle_block_reason: string | null;
}

export interface IdentityResolutionListResponse {
  items: IdentityResolutionRecord[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface DraftMappingPayload {
  internal_part_number: string;
  manufacturer_part_number: string;
  manufacturer_id?: string;
  mapping_source: string;
}

export async function fetchIdentitySummary(token: string): Promise<IdentityResolutionSummary> {
  return apiRequest<IdentityResolutionSummary>('/api/v1/identity-resolution/summary', {
    token
  });
}

export async function fetchIdentityRecords(token: string, params: Record<string, any>): Promise<IdentityResolutionListResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  return apiRequest<IdentityResolutionListResponse>(`/api/v1/identity-resolution/records?${searchParams.toString()}`, {
    token
  });
}

export async function createDraftMapping(token: string, payload: DraftMappingPayload) {
  return apiRequest('/api/v1/part-mappings/', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function updateDraftMapping(token: string, mappingId: string, payload: Partial<DraftMappingPayload>) {
  return apiRequest(`/api/v1/part-mappings/${mappingId}`, {
    method: 'PUT',
    body: payload,
    token
  });
}

export async function verifyMapping(token: string, mappingId: string) {
  return apiRequest(`/api/v1/part-mappings/${mappingId}/verify`, {
    method: 'POST',
    body: { verification_status: 'VERIFIED' },
    token
  });
}

export async function rejectMapping(token: string, mappingId: string) {
  return apiRequest(`/api/v1/part-mappings/${mappingId}/verify`, {
    method: 'POST',
    body: { verification_status: 'REJECTED' },
    token
  });
}


// ─── Lifecycle API ───────────────────────────────────────────────

export interface LifecycleDataResponse {
  lifecycle_status: string | null;
  product_status: string | null;
  is_obsolete: boolean | null;
  is_discontinued: boolean | null;
  end_of_life_date: string | null;
  availability_status: string | null;
}

export interface LifecycleLookupResponse {
  internal_part_number: string;
  manufacturer: string | null;
  manufacturer_part_number: string | null;
  lookup_status: 'NOT_REQUESTED' | 'PENDING' | 'SUCCESS' | 'BLOCKED' | 'FAILED';
  lifecycle: LifecycleDataResponse | null;
  reason: string | null;
  source: string | null;
  retrieved_at: string | null;
}

export interface BatchLifecycleSummary {
  total_items: number;
  unique_parts: number;
  database_hits: number;
  blocked_identities: number;
  mock_results: number;
  actual_nexar_requests: number;
  failed_requests: number;
}

export interface BatchLifecycleDetail {
  part_number: string;
  manufacturer: string;
  lookup_status: string;
  execution_type: string;
  reason: string | null;
}

export interface BatchLifecycleResponse {
  status: string;
  bom_id: string;
  provider: string;
  summary: BatchLifecycleSummary;
  details: BatchLifecycleDetail[];
}

export interface LifecycleProviderInfo {
  active_provider: string;
  is_nexar_active: boolean;
  nexar_configured: boolean;
  available_providers: string[];
}

export async function fetchLifecycleForPart(token: string, internalPartNumber: string): Promise<LifecycleLookupResponse> {
  return apiRequest<LifecycleLookupResponse>(`/api/v1/lifecycle/${encodeURIComponent(internalPartNumber)}`, {
    token
  });
}

export async function triggerBatchLifecycle(token: string, bomId: string): Promise<BatchLifecycleResponse> {
  return apiRequest<BatchLifecycleResponse>(`/api/v1/lifecycle/batch/${bomId}`, {
    method: 'POST',
    token
  });
}

export async function getLifecycleProviderInfo(token: string): Promise<LifecycleProviderInfo> {
  return apiRequest<LifecycleProviderInfo>('/api/v1/lifecycle/provider/info', {
    token
  });
}

