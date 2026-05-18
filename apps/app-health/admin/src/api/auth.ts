import { apiBaseUrl } from './client';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthUserResponse {
  user: AdminUser;
}

const explicitAdminToken = import.meta.env.VITE_APP_HEALTH_ADMIN_TOKEN;
const requestTimeoutMs = 8000;

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(explicitAdminToken ? { authorization: `Bearer ${explicitAdminToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`请求失败：${response.status}`);
    return response.json() as Promise<T>;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new Error('连接管理 API 超时，请确认 Service 已启动。');
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function login(email: string, password: string) {
  return authRequest<AuthUserResponse>('/api/app-health/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return authRequest<{ ok: boolean }>('/api/app-health/auth/logout', { method: 'POST' });
}

export function getMe() {
  return authRequest<AuthUserResponse>('/api/app-health/auth/me');
}
