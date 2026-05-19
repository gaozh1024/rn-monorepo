import { FormEvent, useState } from 'react';
import { apiBaseUrl } from '../api/client';
import { useAuth } from '../app/AuthProvider';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await auth.login(email, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <div className="brand-mark">AH</div>
          <div>
            <strong>App Health</strong>
            <span>管理后台</span>
          </div>
        </div>
        <div>
          <span className="eyebrow">管理员登录</span>
          <h1>登录 App Health</h1>
          <p>自托管 App 健康监控与错误分析平台。</p>
        </div>
        <form className="login-form" onSubmit={event => void submit(event)}>
          <label>
            邮箱
            <input
              value={email}
              onChange={event => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>
          <label>
            密码
            <span className="password-field">
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(current => !current)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>
          {auth.error ? <p className="login-error">{auth.error}</p> : null}
          <Button variant="primary" disabled={submitting}>
            {submitting ? '登录中...' : '登录'}
          </Button>
        </form>
        <div className="login-help">
          <span>API 地址</span>
          <code>{apiBaseUrl}</code>
          <p>
            首次使用请配置 APP_HEALTH_ADMIN_EMAIL、APP_HEALTH_ADMIN_PASSWORD_HASH 和
            APP_HEALTH_SESSION_SECRET。
          </p>
        </div>
      </section>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="password-toggle-icon">
      <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="password-toggle-icon">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6.3 0 9.8 6 9.8 6a18 18 0 0 1-2.7 3.3" />
      <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
      <path d="M6.5 6.8A17.8 17.8 0 0 0 2.2 12s3.5 6 9.8 6a10.4 10.4 0 0 0 4.1-.8" />
    </svg>
  );
}
