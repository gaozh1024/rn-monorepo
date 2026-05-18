import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';

export function AlertsPage({ appId }: { appId: string }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Alert routing</span>
          <h1>Alerts</h1>
          <p>Manage fatal/error webhook routing and delivery health.</p>
        </div>
        <Button>New Rule</Button>
      </div>

      <div className="stats-grid">
        <MetricCard label="Webhook mode" value="Env MVP" tone="info" />
        <MetricCard label="Minimum level" value="fatal" tone="danger" />
        <MetricCard label="Cooldown" value="300s" />
        <MetricCard label="Selected app" value={appId || 'All apps'} />
      </div>

      <Card>
        <CardHeader
          title="Alert rule management is planned for Phase 5"
          description="The service already supports a best-effort webhook through APP_HEALTH_ALERT_WEBHOOK_URL. The console will add editable rules and delivery history."
        />
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Level</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Environment webhook</td>
                <td>fatal</td>
                <td>APP_HEALTH_ALERT_WEBHOOK_URL</td>
                <td>
                  <span className="badge status-open">configured by env</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
