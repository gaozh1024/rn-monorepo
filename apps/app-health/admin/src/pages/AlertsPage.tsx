import { getAppDisplayName } from '../app/appScope';
import type { ProjectAppOption } from '../app/appScope';
import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';

export function AlertsPage({ app }: { app: ProjectAppOption }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">告警路由</span>
          <h1>告警</h1>
          <p>管理致命错误/错误级别的 Webhook 路由和投递健康状态。</p>
        </div>
        <Button>新建规则</Button>
      </div>

      <div className="stats-grid">
        <MetricCard label="Webhook 模式" value="环境变量 MVP" tone="info" />
        <MetricCard label="最低级别" value="fatal" tone="danger" />
        <MetricCard label="冷却时间" value="300 秒" />
        <MetricCard label="当前应用" value={getAppDisplayName(app)} />
      </div>

      <Card>
        <CardHeader
          title="告警规则管理将在后续阶段完善"
          description="Service 已支持通过 APP_HEALTH_ALERT_WEBHOOK_URL 进行尽力投递；控制台后续会加入可编辑规则和投递历史。"
        />
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>规则</th>
                <th>级别</th>
                <th>目标</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>环境变量 Webhook</td>
                <td>fatal</td>
                <td>APP_HEALTH_ALERT_WEBHOOK_URL</td>
                <td>
                  <span className="badge status-open">环境变量配置</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
