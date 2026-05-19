import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createAlertRule,
  deleteAlertRule,
  disableAlertRule,
  enableAlertRule,
  listAlertDeliveries,
  listAlertRules,
  testAlertRule,
  updateAlertRule,
  type AlertDelivery,
  type AlertLevel,
  type AlertRule,
  type AlertRuleInput,
} from '../api/alerts';
import { getAppDisplayName } from '../app/appScope';
import type { ProjectAppOption } from '../app/appScope';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';

const defaultForm: AlertRuleInput = {
  name: '',
  appId: '',
  environment: '',
  minLevel: 'fatal',
  webhookUrl: '',
  cooldownSeconds: 300,
  enabled: true,
};

const levelOptions: AlertLevel[] = ['fatal', 'error', 'warning', 'info'];
const environmentOptions = ['', 'production', 'staging', 'development'];

export function AlertsPage({ app }: { app: ProjectAppOption }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rulesResponse, deliveriesResponse] = await Promise.all([
        listAlertRules({ appId: app.appId }),
        listAlertDeliveries({ appId: app.appId }),
      ]);
      setRules(rulesResponse.items);
      setDeliveries(deliveriesResponse.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '告警配置加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [app.appId]);

  const enabledCount = rules.filter(rule => rule.enabled).length;
  const failedCount = deliveries.filter(delivery => delivery.status === 'failed').length;
  const successCount = deliveries.filter(delivery => delivery.status === 'success').length;
  const lastDeliveryAt = useMemo(() => deliveries[0]?.createdAt, [deliveries]);

  function openCreate() {
    setEditingRule(null);
    setShowForm(true);
  }

  function openEdit(rule: AlertRule) {
    setEditingRule(rule);
    setShowForm(true);
  }

  async function toggleRule(rule: AlertRule) {
    setBusyRuleId(rule.id);
    try {
      if (rule.enabled) {
        await disableAlertRule(rule.id);
      } else {
        await enableAlertRule(rule.id);
      }
      await load();
    } finally {
      setBusyRuleId(null);
    }
  }

  async function handleTest(rule: AlertRule) {
    setBusyRuleId(rule.id);
    try {
      await testAlertRule(rule.id, `Test alert for ${rule.name}`);
      await load();
    } catch (cause) {
      await load();
      setError(cause instanceof Error ? cause.message : '测试 Webhook 失败，已记录投递历史。');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function handleDelete(rule: AlertRule) {
    if (!window.confirm(`删除告警规则「${rule.name}」？历史投递记录会保留。`)) return;
    setBusyRuleId(rule.id);
    try {
      await deleteAlertRule(rule.id);
      await load();
    } finally {
      setBusyRuleId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">告警路由</span>
          <h1>告警</h1>
          <p>为 {getAppDisplayName(app)} 管理 Webhook 规则、测试投递并查看最近投递历史。</p>
        </div>
        <div className="actions">
          <Button onClick={() => void load()}>刷新</Button>
          <Button variant="primary" onClick={openCreate}>
            新建规则
          </Button>
        </div>
      </div>

      <div className="stats-grid">
        <MetricCard label="启用规则" value={enabledCount} tone="info" />
        <MetricCard label="成功投递" value={successCount} tone="success" />
        <MetricCard label="失败投递" value={failedCount} tone={failedCount ? 'danger' : 'info'} />
        <MetricCard
          label="最近投递"
          value={lastDeliveryAt ? new Date(lastDeliveryAt).toLocaleString() : '-'}
          tone="warning"
        />
      </div>

      {loading ? <LoadingState label="正在加载告警配置..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !rules.length ? (
        <Card>
          <CardHeader
            title="还没有告警规则"
            description="创建规则后，匹配的错误事件会发送到配置的 Webhook。"
            actions={
              <Button variant="primary" onClick={openCreate}>
                新建规则
              </Button>
            }
          />
          <EmptyState label="当前仍可使用 APP_HEALTH_ALERT_WEBHOOK_URL 兼容模式；推荐迁移到控制台规则。" />
        </Card>
      ) : null}

      {rules.length ? (
        <Card>
          <CardHeader
            title="告警规则"
            description="空 App 或环境表示匹配全部；Webhook URL 保存后会脱敏显示。"
          />
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>规则</th>
                  <th>范围</th>
                  <th>级别</th>
                  <th>Webhook</th>
                  <th>冷却</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td>
                      <strong>{rule.name}</strong>
                      <small>{rule.id}</small>
                    </td>
                    <td>
                      <span>{rule.appId || '全部应用'}</span>
                      <small>{rule.environment || '全部环境'}</small>
                    </td>
                    <td>
                      <span className={`badge level-${rule.minLevel}`}>{rule.minLevel}</span>
                    </td>
                    <td>
                      <code>{rule.webhookUrlMasked || '-'}</code>
                    </td>
                    <td>{rule.cooldownSeconds}s</td>
                    <td>
                      <span
                        className={`badge ${rule.enabled ? 'status-active' : 'status-disabled'}`}
                      >
                        {rule.enabled ? '启用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          disabled={busyRuleId === rule.id}
                          onClick={() => void handleTest(rule)}
                        >
                          测试
                        </Button>
                        <Button variant="ghost" onClick={() => openEdit(rule)}>
                          编辑
                        </Button>
                        <Button
                          variant="warning"
                          disabled={busyRuleId === rule.id}
                          onClick={() => void toggleRule(rule)}
                        >
                          {rule.enabled ? '停用' : '启用'}
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busyRuleId === rule.id}
                          onClick={() => void handleDelete(rule)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="最近投递" description="展示当前应用最近的告警投递结果，包含测试投递。" />
        {deliveries.length ? (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>规则</th>
                  <th>级别</th>
                  <th>Fingerprint</th>
                  <th>状态</th>
                  <th>HTTP</th>
                  <th>耗时</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(delivery => (
                  <tr key={delivery.id}>
                    <td>
                      {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : '-'}
                    </td>
                    <td>
                      <strong>{delivery.ruleName || delivery.ruleId}</strong>
                      {delivery.test ? <small>测试投递</small> : <small>{delivery.eventId}</small>}
                    </td>
                    <td>
                      <span className={`badge level-${delivery.level}`}>{delivery.level}</span>
                    </td>
                    <td>
                      <code>{delivery.fingerprint}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${delivery.status === 'success' ? 'status-active' : 'status-open'}`}
                      >
                        {delivery.status}
                      </span>
                      {delivery.errorMessage ? <small>{delivery.errorMessage}</small> : null}
                    </td>
                    <td>{delivery.httpStatus || '-'}</td>
                    <td>{delivery.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState label="暂无投递历史。创建规则并触发事件后会显示在这里。" />
        )}
      </Card>

      {showForm ? (
        <AlertRuleModal
          app={app}
          rule={editingRule}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function AlertRuleModal({
  app,
  rule,
  onClose,
  onSaved,
}: {
  app: ProjectAppOption;
  rule: AlertRule | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<AlertRuleInput>(() =>
    rule
      ? {
          name: rule.name,
          appId: rule.appId,
          environment: rule.environment,
          minLevel: rule.minLevel,
          webhookUrl: '',
          cooldownSeconds: rule.cooldownSeconds,
          enabled: rule.enabled,
        }
      : { ...defaultForm, appId: app.appId }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (rule) {
        await updateAlertRule(rule.id, form);
      } else {
        await createAlertRule(form);
      }
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '告警规则保存失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={rule ? '编辑告警规则' : '新建告警规则'}
      >
        <CardHeader
          title={rule ? '编辑告警规则' : '新建告警规则'}
          description="Webhook URL 保存后会脱敏；编辑时留空表示保留旧 URL。"
          actions={
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
          }
        />
        <form className="form-grid" onSubmit={event => void submit(event)}>
          <label>
            <span>规则名称</span>
            <input
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
              placeholder="Production fatal webhook"
              required
            />
          </label>
          <label>
            <span>App 范围</span>
            <select
              value={form.appId}
              onChange={event => setForm({ ...form, appId: event.target.value })}
            >
              <option value="">全部应用</option>
              <option value={app.appId}>
                {getAppDisplayName(app)} ({app.appId})
              </option>
            </select>
          </label>
          <label>
            <span>环境</span>
            <select
              value={form.environment}
              onChange={event => setForm({ ...form, environment: event.target.value })}
            >
              {environmentOptions.map(value => (
                <option key={value || 'all'} value={value}>
                  {value || '全部环境'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>最低级别</span>
            <select
              value={form.minLevel}
              onChange={event => setForm({ ...form, minLevel: event.target.value as AlertLevel })}
            >
              {levelOptions.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Webhook URL</span>
            <input
              value={form.webhookUrl ?? ''}
              onChange={event => setForm({ ...form, webhookUrl: event.target.value })}
              placeholder={
                rule
                  ? rule.webhookUrlMasked || '留空表示不更换 URL'
                  : 'https://example.com/webhook?token=...'
              }
              required={!rule}
            />
          </label>
          <label>
            <span>冷却时间（秒）</span>
            <input
              type="number"
              min={0}
              max={86400}
              value={form.cooldownSeconds}
              onChange={event => setForm({ ...form, cooldownSeconds: Number(event.target.value) })}
            />
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.enabled ?? true}
              onChange={event => setForm({ ...form, enabled: event.target.checked })}
            />
            <span>保存后立即启用</span>
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <div className="actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '保存中...' : '保存规则'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
