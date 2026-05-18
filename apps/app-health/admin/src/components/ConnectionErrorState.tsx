import { apiBaseUrl } from '../api/client';
import { Button } from './ui/Button';

export function ConnectionErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="connection-error" role="alert">
      <div>
        <span className="eyebrow">连接问题</span>
        <h3>无法连接管理 API</h3>
        <p>{message}</p>
      </div>
      <div className="connection-grid">
        <div>
          <span>API 地址</span>
          <code>{apiBaseUrl}</code>
        </div>
        <div>
          <span>本地服务</span>
          <code>go run ./cmd/app-health-service</code>
        </div>
        <div>
          <span>Docker 服务</span>
          <code>docker compose up service</code>
        </div>
      </div>
      <div className="actions">
        {onRetry ? <Button onClick={onRetry}>重试</Button> : null}
        <Button variant="ghost" onClick={() => window.open(`${apiBaseUrl}/healthz`, '_blank')}>
          打开 healthz
        </Button>
      </div>
    </div>
  );
}
