import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';

export function ApplicationsPage({ appId }: { appId: string }) {
  const currentAppId = appId || 'mobile-app';
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Application registry</span>
          <h1>Applications</h1>
          <p>Create apps, generate ingest tokens, and copy SDK setup snippets.</p>
        </div>
        <Button>Create App</Button>
      </div>

      <div className="stats-grid">
        <MetricCard label="Registered apps" value="Coming soon" tone="info" />
        <MetricCard label="Active ingest tokens" value="Soon" />
        <MetricCard label="Last seen app" value={currentAppId} tone="success" />
        <MetricCard label="Setup status" value="Draft" tone="warning" />
      </div>

      <Card>
        <CardHeader
          title="App registry is the next backend milestone"
          description="Phase 1 ships the admin shell. Phase 3 will add app creation, token hashing, and SDK setup generation."
        />
        <div className="setup-preview">
          <div>
            <h3>Planned app model</h3>
            <ul>
              <li>App name, slug, environments, platform</li>
              <li>Per-app ingest tokens with hash-only storage</li>
              <li>SDK setup snippet and curl smoke command</li>
            </ul>
          </div>
          <pre>{`<AppHealthProvider
  appId="${currentAppId}"
  endpoint="https://your-domain.com/api/app-health/events"
  token="ah_ingest_xxx"
  environment="production"
/>`}</pre>
        </div>
      </Card>
    </div>
  );
}
