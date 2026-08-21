const API_BASE = 'http://127.0.0.1:8000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  contentType?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token, contentType = 'application/json' } = options;

  const headers: Record<string, string> = {};
  
  // If contentType is empty string, let the browser set it (needed for FormData/multipart)
  if (contentType) headers['Content-Type'] = contentType;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  
  if (body) {
    if (body instanceof FormData) {
      // FormData: don't serialize, don't set Content-Type (browser handles boundary)
      config.body = body;
    } else if (contentType === 'application/json') {
      config.body = JSON.stringify(body);
    } else {
      config.body = body as string;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function loginRequest(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function registerRequest(username: string, email: string, password: string) {
  return apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username, email, password },
  });
}
