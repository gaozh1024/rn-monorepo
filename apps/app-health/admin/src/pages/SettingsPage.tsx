import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiBaseUrl } from '../api/client';
import {
  getSettingsSummary,
  listRetentionRuns,
  retentionDryRun,
  retentionRun,
  type RetentionRun,
  type SettingsSummary,
} from '../api/settings';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';

const confirmationText = 'DELETE_OLD_EVENTS';

export function SettingsPage() {
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [runs, setRuns] = useState<RetentionRun[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [lastDryRun, setLastDryRun] = useState<RetentionRun | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [ackBackup, setAckBackup] = useState(false);
  const [ackDryRun, setAckDryRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'dry-run' | 'load' | 'run' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setBusy('load');
    setError(null);
    try {
      const [summaryResponse, runsResponse] = await Promise.all([
        getSettingsSummary(),
        listRetentionRuns(20),
      ]);
      setSummary(summaryResponse);
      setRuns(runsResponse.items);
      setRetentionDays(summaryResponse.retention.eventRetentionDays || 30);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '设置加载失败。');
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canRun = useMemo(() => {
    return Boolean(
      lastDryRun &&
      lastDryRun.status === 'success' &&
      lastDryRun.eventRetentionDays === retentionDays &&
      ackBackup &&
      ackDryRun &&
      confirmText === confirmationText
    );
  }, [ackBackup, ackDryRun, confirmText, lastDryRun, retentionDays]);

  async function handleDryRun() {
    setBusy('dry-run');
    setError(null);
    setMessage(null);
    try {
      const response = await retentionDryRun({ eventRetentionDays: retentionDays });
      setLastDryRun(response.run);
      setMessage(`Dry-run 完成：预计删除 ${response.run.deletedEvents} 条事件。`);
      await refreshRuns();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Retention dry-run 失败。');
    } finally {
      setBusy(null);
    }
  }

  async function handleRun() {
    if (!lastDryRun) return;
    setBusy('run');
    setError(null);
    setMessage(null);
    try {
      const response = await retentionRun({
        eventRetentionDays: retentionDays,
        dryRunId: lastDryRun.id,
        confirmText,
        acknowledgedBackup: ackBackup,
        acknowledgedDryRun: ackDryRun,
      });
      setMessage(`Retention run 完成：已删除 ${response.run.deletedEvents} 条事件。`);
      setLastDryRun(null);
      setConfirmText('');
      setAckBackup(false);
      setAckDryRun(false);
      await refreshRuns();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Retention run 失败。');
    } finally {
      setBusy(null);
    }
  }

  async function refreshRuns() {
    const response = await listRetentionRuns(20);
    setRuns(response.items);
  }

  function updateRetentionDays(value: string) {
    const parsed = Number(value);
    setRetentionDays(Number.isFinite(parsed) ? parsed : 0);
    setAckDryRun(false);
    setConfirmText('');
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">运维设置</span>
          <h1>设置</h1>
          <p>查看服务健康、脱敏运行配置、数据保留策略和操作历史。</p>
        </div>
        <div className="actions">
          <Button disabled={busy === 'load'} onClick={() => void load()}>
            刷新
          </Button>
          <Button variant="ghost" onClick={() => window.open(`${apiBaseUrl}/healthz`, '_blank')}>
            打开 healthz
          </Button>
        </div>
      </div>

      {loading ? <LoadingState label="正在加载设置..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {message ? <div className="state state-empty">{message}</div> : null}

      <div className="settings-grid">
        <Card>
          <CardHeader
            title="服务健康"
            description="由后台 summary API 汇总 readyz 与当前运行配置。"
          />
          <dl className="definition-list">
            <Definition label="API 地址">
              <code>{apiBaseUrl}</code>
            </Definition>
            <Definition label="环境">{summary?.service.env || '-'}</Definition>
            <Definition label="数据库配置">
              {formatBool(summary?.service.databaseConfigured)}
            </Definition>
            <Definition label="数据库就绪">{formatBool(summary?.service.databaseReady)}</Definition>
            <Definition label="CORS Origins">
              {summary?.service.corsOrigins.join(', ') || '-'}
            </Definition>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="运行配置摘要"
            description="只展示布尔值、数值和枚举值，不返回 secret 原文。"
          />
          <dl className="definition-list">
            <Definition label="Max Body">{formatBytes(summary?.service.maxBodyBytes)}</Definition>
            <Definition label="Rate Limit">
              {summary
                ? `${summary.service.ingestRateLimitRps} rps / ${summary.service.ingestRateLimitBurst} burst`
                : '-'}
            </Definition>
            <Definition label="Alert Env Fallback">
              {formatBool(summary?.alerts.envFallbackEnabled)}
            </Definition>
            <Definition label="Alert Level / Cooldown">
              {summary ? `${summary.alerts.minLevel} / ${summary.alerts.cooldownSeconds}s` : '-'}
            </Definition>
            <Definition label="Admin Email">{summary?.admin.email || '-'}</Definition>
            <Definition label="Session">
              {summary
                ? `${summary.admin.sessionTtlHours}h / secure=${summary.admin.cookieSecure ? 'yes' : 'no'}`
                : '-'}
            </Definition>
          </dl>
        </Card>

        <Card className="settings-wide-card">
          <CardHeader
            title="数据保留"
            description="先 dry-run，再通过四重确认执行真实删除；issue 摘要引用的 sample/last event 会被保护。"
          />
          <div className="retention-panel">
            <div className="retention-controls">
              <label>
                保留天数
                <input
                  min={1}
                  max={3650}
                  type="number"
                  value={retentionDays}
                  onChange={event => updateRetentionDays(event.target.value)}
                />
              </label>
              <Button
                disabled={busy === 'dry-run' || retentionDays <= 0}
                onClick={() => void handleDryRun()}
              >
                执行 dry-run
              </Button>
            </div>

            {lastDryRun ? (
              <RetentionResultCard run={lastDryRun} />
            ) : (
              <EmptyState label="先执行 dry-run 查看预计删除范围。" />
            )}

            <div className="warning-panel">
              <strong>危险操作确认</strong>
              <p>真实 run 会删除早于 cutoff 且未被 issue 摘要保护的事件。建议先完成备份。</p>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={ackDryRun}
                  onChange={event => setAckDryRun(event.target.checked)}
                />
                我已阅读本次 dry-run 结果
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={ackBackup}
                  onChange={event => setAckBackup(event.target.checked)}
                />
                我已完成备份或接受删除风险
              </label>
              <label>
                输入确认短语 <code>{confirmationText}</code>
                <input value={confirmText} onChange={event => setConfirmText(event.target.value)} />
              </label>
              <Button
                variant="danger"
                disabled={!canRun || busy === 'run'}
                onClick={() => void handleRun()}
              >
                执行真实 retention run
              </Button>
            </div>
          </div>
        </Card>

        <Card className="settings-wide-card">
          <CardHeader
            title="Retention 历史"
            description="展示最近 20 条 dry-run / run 操作，失败也会记录。"
          />
          {runs.length ? (
            <div className="table-card retention-table-card">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>模式</th>
                    <th>天数</th>
                    <th>Cutoff</th>
                    <th>保护</th>
                    <th>删除</th>
                    <th>状态</th>
                    <th>错误</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id}>
                      <td>{formatDate(run.createdAt)}</td>
                      <td>{run.mode}</td>
                      <td>{run.eventRetentionDays}</td>
                      <td>{formatDate(run.cutoff)}</td>
                      <td>{run.protectedEventIds}</td>
                      <td>{run.deletedEvents}</td>
                      <td>
                        <span
                          className={`badge ${run.status === 'success' ? 'status-active' : 'status-open'}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td>{run.errorMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="还没有 retention 操作历史。" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="成员与角色"
            description="当前阶段提供单管理员登录；多用户 RBAC 会在后续阶段补齐。"
          />
          <div className="empty-panel">Owner / Admin / Developer / Viewer</div>
        </Card>

        <Card>
          <CardHeader
            title="安全提示"
            description="Settings API 已脱敏；如果缺少生产配置，会在这里提示。"
          />
          {summary?.warnings.length ? (
            <ul className="checklist">
              {summary.warnings.map(warning => (
                <li key={warning}>
                  <span />
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="暂无配置风险提示。" />
          )}
        </Card>
      </div>
    </div>
  );
}

function Definition({ label, children }: { children: ReactNode; label: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function RetentionResultCard({ run }: { run: RetentionRun }) {
  return (
    <div className="retention-result">
      <div>
        <span>Cutoff</span>
        <strong>{formatDate(run.cutoff)}</strong>
      </div>
      <div>
        <span>预计删除</span>
        <strong>{run.deletedEvents}</strong>
      </div>
      <div>
        <span>保护事件</span>
        <strong>{run.protectedEventIds}</strong>
      </div>
      <div>
        <span>Dry-run ID</span>
        <code>{run.id}</code>
      </div>
    </div>
  );
}

function formatBool(value?: boolean) {
  if (value === undefined) return '-';
  return value ? '是' : '否';
}

function formatBytes(value?: number) {
  if (!value) return '-';
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}
