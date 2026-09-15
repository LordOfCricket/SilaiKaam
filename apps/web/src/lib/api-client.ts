import { env } from '@/config/env';

export interface ApiErrorPayload {
  code?: string;
  message: string | string[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(Array.isArray(payload.message) ? payload.message[0] : payload.message);
    this.status = status;
    this.code = payload.code;
  }
}

/** Thrown when `fetch` itself fails (offline, DNS, connection refused) —
 * distinct from ApiError so the UI can show a "check your connection"
 * message instead of a generic server error. */
export class NetworkError extends Error {
  constructor() {
    super('Network error. Check your connection and try again.');
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new NetworkError();
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const errorPayload: ApiErrorPayload =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as ApiErrorPayload)
        : { message: 'Something went wrong. Please try again.' };
    throw new ApiError(response.status, errorPayload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
