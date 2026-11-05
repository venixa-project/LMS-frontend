/**
 * Acuity LMS Enterprise — Unified Frontend API Client
 * Connects frontend stores and components directly to the production backend.
 */
import { AUTH_SESSION_KEY } from './authConstants';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
}

interface StoredAuthSession {
  userId: string;
  email: string;
  activeRole?: string;
  token?: string;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(error: ApiErrorResponse) {
    super(error.message || 'API request failed');
    this.name = 'ApiError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.details = error.details;
  }
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.token || null;
  } catch {
    return null;
  }
}

let legacyStudentLoginInFlight: Promise<void> | null = null;

function isMockAuthToken(token: string | null): boolean {
  if (!token) return false;
  return token.startsWith('venilearn-token-') || token.startsWith('demo-') || token.length < 20 || !token.includes('.');
}

function getDemoCredentialsForRole(role?: string, email?: string): { email: string; password: string } {
  if (email && email.trim()) {
    return { email: email.trim(), password: 'Password@123' };
  }
  const normRole = (role || '').toLowerCase();
  if (normRole === 'platform_admin' || normRole === 'superadmin') {
    return { email: 'superadmin@acuity.com', password: 'Password@123' };
  }
  if (normRole === 'student' || normRole === 'learner') {
    return { email: 'student@lms.demo', password: 'Password@123' };
  }
  if (normRole === 'trainer' || normRole === 'instructor') {
    return { email: 'trainer@lms.demo', password: 'Password@123' };
  }
  return { email: 'orgadmin@lms.demo', password: 'Password@123' };
}

function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  if (isMockAuthToken(token)) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === 'number') {
      return Date.now() >= (payload.exp * 1000 - 30000);
    }
    return false;
  } catch {
    return true;
  }
}

async function reauthenticateSession(): Promise<boolean> {
  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) return false;

  let session: StoredAuthSession;
  try {
    session = JSON.parse(rawSession) as StoredAuthSession;
  } catch {
    return false;
  }

  // 1. Try refresh-token endpoint first
  try {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const isJson = refreshRes.headers.get('content-type')?.includes('application/json');
      const body = isJson ? await refreshRes.json() : null;
      if (body?.success && body.data?.accessToken) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
          ...session,
          token: body.data.accessToken,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }));
        return true;
      }
    }
  } catch (err) {
    console.warn('Silent refresh-token failed:', err);
  }

  // 2. Fall back to role/email re-login
  try {
    const creds = getDemoCredentialsForRole(session.activeRole, session.email);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(creds),
    });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await response.json() as { success?: boolean; data?: { accessToken?: string; user?: { tenantId?: string } } } : null;

    if (response.ok && body?.success && body.data?.accessToken) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        ...session,
        token: body.data.accessToken,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }));
      if (body.data.user?.tenantId) {
        localStorage.setItem('venilearn_active_tenant_id', body.data.user.tenantId);
      }
      return true;
    }
  } catch (err) {
    console.warn('Auto-reauth failed:', err);
  }

  return false;
}

async function migrateLegacyStudentSession(endpoint: string): Promise<void> {
  if (endpoint.replace(/\/+$/, '').endsWith('/auth/login')) return;
  if (endpoint.replace(/\/+$/, '').endsWith('/auth/refresh-token')) return;

  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) return;

  let session: StoredAuthSession;
  try {
    session = JSON.parse(rawSession) as StoredAuthSession;
  } catch {
    return;
  }

  const token = session.token || null;
  if (!token || isMockAuthToken(token) || isJwtExpired(token)) {
    if (!legacyStudentLoginInFlight) {
      legacyStudentLoginInFlight = reauthenticateSession().then(() => {});
    }
    await legacyStudentLoginInFlight;
    legacyStudentLoginInFlight = null;
  }
}

export function hasBackendAccessToken(): boolean {
  const token = getStoredToken();
  return Boolean(token && !isMockAuthToken(token));
}

function getStoredTenantId(): string | null {
  try {
    const raw = localStorage.getItem('venilearn_active_tenant_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('venilearn_active_org_id') : null);
    return raw || null;
  } catch {
    return null;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  await migrateLegacyStudentSession(endpoint);
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tenantId = getStoredTenantId();
  if (tenantId && !headers['X-Tenant-Id']) {
    headers['X-Tenant-Id'] = tenantId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !(options.headers as any)?._isRetry) {
      const recovered = await reauthenticateSession();
      if (recovered) {
        return request<T>(endpoint, {
          ...options,
          headers: {
            ...(options.headers as Record<string, string>),
            _isRetry: 'true',
          },
        });
      }
    }

    if (isJson && body && body.success === false) {
      throw new ApiError(body as ApiErrorResponse);
    }
    throw new ApiError({
      success: false,
      statusCode: response.status,
      message: typeof body === 'string' ? body : response.statusText,
      code: `HTTP_${response.status}`,
    });
  }

  return body as ApiResponse<T>;
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),

  upload: async <T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {};

    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const tenantId = getStoredTenantId();
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      if (isJson && body && body.success === false) {
        throw new ApiError(body as ApiErrorResponse);
      }
      throw new ApiError({
        success: false,
        statusCode: response.status,
        message: typeof body === 'string' ? body : response.statusText,
        code: `HTTP_${response.status}`,
      });
    }

    return body as ApiResponse<T>;
  },
};
