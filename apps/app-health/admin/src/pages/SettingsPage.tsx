import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiBaseUrl } from '../api/client';

export function SettingsPage() {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">运维设置</span>
          <h1>设置</h1>
          <p>查看服务健康、数据保留、成员角色和部署配置。</p>
        </div>
      </div>

      <div className="settings-grid">
        <Card>
          <CardHeader
            title="服务健康"
            description="从当前浏览器快速检查 Go Service 的健康接口。"
            actions={
              <Button
                variant="ghost"
                onClick={() => window.open(`${apiBaseUrl}/healthz`, '_blank')}
              >
                打开 healthz
              </Button>
            }
          />
          <dl className="definition-list">
            <div>
              <dt>API 地址</dt>
              <dd>
                <code>{apiBaseUrl}</code>
              </dd>
            </div>
            <div>
              <dt>就绪检查</dt>
              <dd>
                <code>{apiBaseUrl}/readyz</code>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="数据保留"
            description="后续阶段会在这里提供 app-health-retention 的 dry-run 和执行入口。"
          />
          <dl className="definition-list">
            <div>
              <dt>默认保留</dt>
              <dd>30 天</dd>
            </div>
            <div>
              <dt>安全模式</dt>
              <dd>默认先 dry-run</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="成员与角色"
            description="当前阶段提供单管理员登录；多用户 RBAC 会在应用注册表之后补齐。"
          />
          <div className="empty-panel">Owner / Admin / Developer / Viewer</div>
        </Card>
      </div>
    </div>
  );
}
