export interface ApiClientOptions {
  baseUrl?: string;
  adminToken?: string;
}

export type QueryValue = boolean | number | string | null | undefined;
export type QueryParams = Record<string, QueryValue>;

const defaultBaseUrl = import.meta.env.VITE_APP_HEALTH_API_BASE_URL || 'http://localhost:8080';
const defaultAdminToken = import.meta.env.VITE_APP_HEALTH_ADMIN_TOKEN || 'admin_dev';

export function buildQuery(params: object = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params) as Array<[string, QueryValue]>) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function apiGet<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const response = await fetch(`${options.baseUrl ?? defaultBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${options.adminToken ?? defaultAdminToken}`,
    },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options: ApiClientOptions = {}
): Promise<T> {
  const response = await fetch(`${options.baseUrl ?? defaultBaseUrl}${path}`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${options.adminToken ?? defaultAdminToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
