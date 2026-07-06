import { ApiError } from '../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/login`;
    return null;
  }

  const data = await res.json();
  localStorage.setItem('access_token', data.data.accessToken);
  localStorage.setItem('refresh_token', data.data.refreshToken);
  return data.data.accessToken;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  let token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];
      token = newToken;
    } else {
      await new Promise<void>((resolve) => {
        refreshQueue.push(() => resolve());
      });
      token = await getAccessToken();
    }

    if (token) {
      return request<T>(path, options, false);
    }
  }

  if (res.status === 204) return undefined as unknown as T;

  const json = await res.json();

  if (!res.ok) {
    const error = json as ApiError;
    throw new ApiClientError(
      error.error.code,
      error.error.message,
      error.error.details as Record<string, string[]> | undefined,
      res.status,
    );
  }

  return json as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  getBlob: async (path: string): Promise<Blob> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  postFormData: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
      headers: {} as Record<string, string>, // let browser set multipart boundary
    }),
};

export { ApiClientError };
