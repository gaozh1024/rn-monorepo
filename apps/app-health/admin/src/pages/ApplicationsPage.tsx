import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';

export function ApplicationsPage({ appId }: { appId: string }) {
  const currentAppId = appId || 'mobile-app';
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">应用注册表</span>
          <h1>应用管理</h1>
          <p>创建应用、生成上报 Token，并复制 rn-health SDK 接入片段。</p>
        </div>
        <Button>创建应用</Button>
      </div>

      <div className="stats-grid">
        <MetricCard label="已注册应用" value="即将支持" tone="info" />
        <MetricCard label="有效 Token" value="即将支持" />
        <MetricCard label="最近应用" value={currentAppId} tone="success" />
        <MetricCard label="接入状态" value="规划中" tone="warning" />
      </div>

      <Card>
        <CardHeader
          title="应用注册表是下一阶段后端里程碑"
          description="当前阶段先交付管理员登录和中文控制台；后续会加入应用创建、Token 哈希存储和 SDK 接入向导。"
        />
        <div className="setup-preview">
          <div>
            <h3>计划中的应用模型</h3>
            <ul>
              <li>应用名称、应用 ID、环境和平台</li>
              <li>应用级上报 Token，仅保存哈希</li>
              <li>SDK 初始化片段和 curl 冒烟命令</li>
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
