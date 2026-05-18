export interface ApiClientOptions {
  baseUrl?: string;
  adminToken?: string;
}

export type QueryValue = boolean | number | string | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export const apiBaseUrl = import.meta.env.VITE_APP_HEALTH_API_BASE_URL || 'http://localhost:8080';
const defaultAdminToken = import.meta.env.VITE_APP_HEALTH_ADMIN_TOKEN || '';

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
  const response = await fetch(`${options.baseUrl ?? apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: adminHeaders(options),
  });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options: ApiClientOptions = {}
): Promise<T> {
  const response = await fetch(`${options.baseUrl ?? apiBaseUrl}${path}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: {
      ...adminHeaders(options),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return response.json() as Promise<T>;
}

function adminHeaders(options: ApiClientOptions) {
  const token = options.adminToken ?? defaultAdminToken;
  return token ? { authorization: `Bearer ${token}` } : undefined;
}
