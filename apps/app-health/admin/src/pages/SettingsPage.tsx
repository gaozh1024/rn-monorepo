import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiBaseUrl } from '../api/client';

export function SettingsPage() {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Settings</h1>
          <p>Service health, retention, members, and deployment configuration.</p>
        </div>
      </div>

      <div className="settings-grid">
        <Card>
          <CardHeader
            title="Service health"
            description="Quick links for checking the Go service from this browser."
            actions={
              <Button
                variant="ghost"
                onClick={() => window.open(`${apiBaseUrl}/healthz`, '_blank')}
              >
                Open healthz
              </Button>
            }
          />
          <dl className="definition-list">
            <div>
              <dt>API base URL</dt>
              <dd>
                <code>{apiBaseUrl}</code>
              </dd>
            </div>
            <div>
              <dt>Readiness</dt>
              <dd>
                <code>{apiBaseUrl}/readyz</code>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Retention"
            description="Phase 5 will expose dry-run and run controls for app-health-retention."
          />
          <dl className="definition-list">
            <div>
              <dt>Default retention</dt>
              <dd>30 days</dd>
            </div>
            <div>
              <dt>Safe mode</dt>
              <dd>Dry-run first</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Members & roles"
            description="Phase 2 starts with owner login. Multi-user RBAC follows after app registry."
          />
          <div className="empty-panel">Owner / Admin / Developer / Viewer</div>
        </Card>
      </div>
    </div>
  );
}
