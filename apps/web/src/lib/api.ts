import type { ApiResponse } from '@kutty-story/shared';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  // For FormData (file uploads), the browser MUST set Content-Type itself so it
  // can include the multipart boundary. Setting it manually breaks the upload.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = undefined;
    }
    const message =
      (errorData as { error?: string })?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'DELETE' });
  },

  /** Upload a file using multipart/form-data. */
  upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary
    });
  },
};

export { ApiError };

/**
 * Ensure a session cookie exists before calling an auth-guarded endpoint.
 * If the visitor isn't signed in, this mints an anonymous guest session so they
 * can upload photos and generate a book without the friction of signing up.
 * Idempotent on the server; the in-flight/successful result is cached so we hit
 * the endpoint at most once per page load.
 */
let guestSessionPromise: Promise<void> | null = null;
export function ensureGuestSession(): Promise<void> {
  if (!guestSessionPromise) {
    guestSessionPromise = api
      .post('/auth/guest')
      .then(() => undefined)
      .catch(() => {
        guestSessionPromise = null;
      });
  }
  return guestSessionPromise;
}
