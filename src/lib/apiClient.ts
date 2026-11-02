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

async function migrateLegacyStudentSession(endpoint: string): Promise<void> {
  if (endpoint.replace(/\/+$/, '').endsWith('/auth/login')) return;

  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) return;

  let session: StoredAuthSession;
  try {
    session = JSON.parse(rawSession) as StoredAuthSession;
  } catch {
    return;
  }

  if (
    session.email?.toLowerCase() !== 'student@lms.demo' ||
    session.activeRole !== 'student' ||
    !isMockAuthToken(session.token || null)
  ) {
    return;
  }

  if (!legacyStudentLoginInFlight) {
    legacyStudentLoginInFlight = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'student@acuity.com', password: 'Password@123' }),
      });
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const body = isJson
        ? await response.json() as {
            success?: boolean;
            message?: string;
            data?: { accessToken?: string; user?: { tenantId?: string } };
          }
        : null;

      if (!response.ok || !body?.success || !body.data?.accessToken || !body.data.user?.tenantId) {
        throw new ApiError({
          success: false,
          statusCode: response.status,
          message: body?.message || `Unable to restore the student demo session (${response.status}).`,
          code: 'DEMO_SESSION_MIGRATION_FAILED',
        });
      }

      if (localStorage.getItem(AUTH_SESSION_KEY) !== rawSession) {
        throw new ApiError({
          success: false,
          statusCode: 401,
          message: 'Your session changed during sign-in. Please refresh and try again.',
          code: 'SESSION_CHANGED',
        });
      }

      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        ...session,
        token: body.data.accessToken,
        expiresAt: Date.now() + 15 * 60 * 1000,
      }));
      localStorage.setItem('venilearn_active_tenant_id', body.data.user.tenantId);
    })().finally(() => {
      legacyStudentLoginInFlight = null;
    });
  }

  await legacyStudentLoginInFlight;
}

export function hasBackendAccessToken(): boolean {
  const token = getStoredToken();
  return Boolean(token && !isMockAuthToken(token));
}

function getStoredTenantId(): string | null {
  try {
    const raw = localStorage.getItem('venilearn_active_tenant_id');
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
  if (token && !headers['Authorization'] && !isMockAuthToken(token)) {
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
    if (token && !isMockAuthToken(token)) headers['Authorization'] = `Bearer ${token}`;

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
