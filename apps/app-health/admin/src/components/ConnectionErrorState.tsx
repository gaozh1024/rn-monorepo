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
        <span className="eyebrow">Connection problem</span>
        <h3>Admin API is not reachable</h3>
        <p>{message}</p>
      </div>
      <div className="connection-grid">
        <div>
          <span>API base URL</span>
          <code>{apiBaseUrl}</code>
        </div>
        <div>
          <span>Local service</span>
          <code>go run ./cmd/app-health-service</code>
        </div>
        <div>
          <span>Docker service</span>
          <code>docker compose up service</code>
        </div>
      </div>
      <div className="actions">
        {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
        <Button variant="ghost" onClick={() => window.open(`${apiBaseUrl}/healthz`, '_blank')}>
          Open healthz
        </Button>
      </div>
    </div>
  );
}
