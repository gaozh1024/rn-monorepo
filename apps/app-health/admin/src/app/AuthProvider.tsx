import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../api/auth';
import { getMe, login as loginRequest, logout as logoutRequest } from '../api/auth';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const authBootstrapTimeoutMs = 9000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setUser(null);
        setLoading(false);
      }
    }, authBootstrapTimeoutMs);

    getMe()
      .then(response => {
        if (!cancelled) setUser(response.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      async login(email: string, password: string) {
        setError(null);
        try {
          const response = await loginRequest(email, password);
          setUser(response.user);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : '登录失败';
          setError(message.includes('401') ? '账号或密码错误' : message);
          throw cause;
        }
      },
      async logout() {
        await logoutRequest().catch(() => undefined);
        setUser(null);
      },
    }),
    [error, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
