import { FormEvent, useState } from 'react';
import { apiBaseUrl } from '../api/client';
import { useAuth } from '../app/AuthProvider';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
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
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type="password"
              required
            />
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
