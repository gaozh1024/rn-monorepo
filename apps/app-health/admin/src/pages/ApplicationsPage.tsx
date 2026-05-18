import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createApplication,
  createToken,
  deleteApplication,
  deleteApplicationWithData,
  disableApplication,
  enableApplication,
  getApplication,
  listApplications,
  revokeToken,
  type Application,
  type ApplicationSummary,
  type CreateApplicationInput,
  type IngestToken,
} from '../api/applications';
import { apiBaseUrl } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import type { DropdownOption } from '../components/ui/DropdownSelect';
import { MetricCard } from '../components/ui/MetricCard';

const defaultForm: CreateApplicationInput = {
  name: '',
  slug: '',
  description: '',
  defaultEnvironment: 'production',
  platforms: ['ios', 'android'],
};

const platformOptions = ['ios', 'android', 'web', 'other'];

const defaultEnvironmentOptions: DropdownOption[] = [
  { value: 'production', label: 'production' },
  { value: 'staging', label: 'staging' },
  { value: 'development', label: 'development' },
];

const tokenPurposeOptions = [
  { key: 'default', label: '默认', name: 'Default ingest token' },
  { key: 'ios', label: 'iOS', name: 'iOS ingest token' },
  { key: 'android', label: 'Android', name: 'Android ingest token' },
  { key: 'web', label: 'Web', name: 'Web ingest token' },
  { key: 'test', label: '测试', name: 'Test ingest token' },
  { key: 'custom', label: '自定义', name: '' },
] as const;

type TokenPurposeKey = (typeof tokenPurposeOptions)[number]['key'];

interface SelectedApplication {
  application: Application;
  tokens: IngestToken[];
}

interface DeleteTarget {
  application: ApplicationSummary;
  mode: 'data' | 'registration';
}

export function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<SelectedApplication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState<IngestToken | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [disableTarget, setDisableTarget] = useState<ApplicationSummary | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await listApplications();
      setApplications(response.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '应用列表加载失败。');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string, nextToken: IngestToken | null = null) {
    setDetailLoading(true);
    setCreatedToken(nextToken);
    try {
      const response = await getApplication(id);
      setSelected(response);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const tokenCount = applications.reduce(
    (total, application) => total + application.effectiveTokenCount,
    0
  );
  const eventCount = applications.reduce((total, application) => total + application.eventCount, 0);
  const latestEventAt = useMemo(() => {
    const timestamps = applications
      .map(application => application.lastEventAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .reverse();
    return timestamps[0];
  }, [applications]);

  async function handleCreated(application: Application, token: IngestToken) {
    setShowCreate(false);
    await load();
    await loadDetail(application.id, token);
  }

  async function handleEnable(application: ApplicationSummary) {
    setStatusUpdatingId(application.id);
    try {
      await enableApplication(application.id);
      await load();
      if (selected?.application.id === application.id) {
        await loadDetail(application.id);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDisable(application: ApplicationSummary) {
    setStatusUpdatingId(application.id);
    try {
      await disableApplication(application.id);
      setDisableTarget(null);
      await load();
      if (selected?.application.id === application.id) {
        await loadDetail(application.id);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleted() {
    setDeleteTarget(null);
    setSelected(null);
    setCreatedToken(null);
    await load();
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">应用注册表</span>
          <h1>应用管理</h1>
          <p>创建、查看、停用、删除应用，并管理上报 Token。</p>
        </div>
        <div className="actions">
          <Button onClick={() => void load()}>刷新</Button>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            创建应用
          </Button>
        </div>
      </div>

      <div className="stats-grid">
        <MetricCard label="已注册应用" value={applications.length} tone="info" />
        <MetricCard label="有效 Token" value={tokenCount} />
        <MetricCard label="累计事件" value={eventCount} tone="success" />
        <MetricCard
          label="最近上报"
          value={latestEventAt ? new Date(latestEventAt).toLocaleString() : '-'}
          tone="warning"
        />
      </div>

      {loading ? <LoadingState label="正在加载应用..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && !applications.length ? (
        <Card>
          <CardHeader
            title="还没有注册应用"
            description="创建第一个应用后，系统会生成一次性上报 Token。"
            actions={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                创建应用
              </Button>
            }
          />
          <EmptyState label="应用创建完成后，可以在详情里复制接入配置和管理 Token。" />
        </Card>
      ) : null}

      {!loading && !error && applications.length ? (
        <Card>
          <CardHeader
            title="应用列表"
            description="列表页只展示应用和管理动作；接入配置在应用详情中查看。"
          />
          <div className="table-card application-table-card">
            <table>
              <thead>
                <tr>
                  <th>应用</th>
                  <th>App ID</th>
                  <th>环境</th>
                  <th>平台</th>
                  <th>Token</th>
                  <th>事件</th>
                  <th>问题</th>
                  <th>最近上报</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(application => (
                  <tr key={application.id}>
                    <td>
                      <button
                        className="link-button strong-link"
                        onClick={() => void loadDetail(application.id)}
                      >
                        {application.name}
                      </button>
                      {application.description ? (
                        <span className="table-subtext">{application.description}</span>
                      ) : null}
                    </td>
                    <td>
                      <code>{application.slug}</code>
                    </td>
                    <td>{application.defaultEnvironment}</td>
                    <td>{application.platforms.length ? application.platforms.join(', ') : '-'}</td>
                    <td>{application.effectiveTokenCount}</td>
                    <td>{application.eventCount}</td>
                    <td>{application.issueCount}</td>
                    <td>
                      {application.lastEventAt
                        ? new Date(application.lastEventAt).toLocaleString()
                        : '-'}
                    </td>
                    <td>
                      <span className={`badge status-${application.status}`}>
                        {application.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void loadDetail(application.id)}
                        >
                          详情
                        </Button>
                        <Button
                          type="button"
                          variant={application.status === 'active' ? 'warning' : 'success'}
                          disabled={statusUpdatingId === application.id}
                          onClick={() => {
                            if (application.status === 'active') {
                              setDisableTarget(application);
                              return;
                            }
                            void handleEnable(application);
                          }}
                        >
                          {statusUpdatingId === application.id
                            ? application.status === 'active'
                              ? '停用中...'
                              : '启用中...'
                            : application.status === 'active'
                              ? '停用'
                              : '启用'}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => setDeleteTarget({ application, mode: 'registration' })}
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

      {showCreate ? (
        <CreateApplicationDialog onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      ) : null}
      {selected ? (
        <ApplicationDetailDrawer
          detail={selected}
          createdToken={createdToken}
          loading={detailLoading}
          onClose={() => {
            setSelected(null);
            setCreatedToken(null);
          }}
          onRefresh={() => void loadDetail(selected.application.id)}
          onTokenCreated={async token => {
            await load();
            await loadDetail(selected.application.id, token);
          }}
          onTokenRevoked={async tokenId => {
            await revokeToken(tokenId);
            await load();
            await loadDetail(selected.application.id);
          }}
          onDeleteData={() => {
            const summary = applications.find(item => item.id === selected.application.id);
            if (summary) setDeleteTarget({ application: summary, mode: 'data' });
          }}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteApplicationDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
      {disableTarget ? (
        <DisableApplicationDialog
          application={disableTarget}
          submitting={statusUpdatingId === disableTarget.id}
          onClose={() => setDisableTarget(null)}
          onConfirm={() => void handleDisable(disableTarget)}
        />
      ) : null}
    </div>
  );
}

function CreateApplicationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (application: Application, token: IngestToken) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateApplicationInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await createApplication(form);
      await onCreated(response.application, response.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '应用创建失败。');
    } finally {
      setSubmitting(false);
    }
  }

  function togglePlatform(platform: string) {
    setForm(current => {
      const platforms = current.platforms.includes(platform)
        ? current.platforms.filter(item => item !== platform)
        : [...current.platforms, platform];
      return { ...current, platforms };
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label="创建应用">
        <div className="card-header">
          <div>
            <h2>创建应用</h2>
            <p>应用 ID 会用于事件 app.id，也会绑定生成的上报 Token。</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
        <form className="app-form" onSubmit={event => void submit(event)}>
          <label>
            应用名称
            <input
              value={form.name}
              onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              placeholder="Mobile App"
              required
            />
          </label>
          <label>
            App ID
            <input
              value={form.slug}
              onChange={event => setForm(current => ({ ...current, slug: event.target.value }))}
              placeholder="com.example.app"
            />
          </label>
          <label>
            描述
            <input
              value={form.description}
              onChange={event =>
                setForm(current => ({ ...current, description: event.target.value }))
              }
              placeholder="生产移动端应用"
            />
          </label>
          <label>
            默认环境
            <DropdownSelect
              value={form.defaultEnvironment}
              options={defaultEnvironmentOptions}
              onChange={value => setForm(current => ({ ...current, defaultEnvironment: value }))}
            />
          </label>
          <fieldset className="platform-field">
            <legend>平台</legend>
            <div className="segmented-options">
              {platformOptions.map(platform => (
                <label key={platform}>
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                  {platform}
                </label>
              ))}
            </div>
          </fieldset>
          {error ? <p className="login-error">{error}</p> : null}
          <div className="actions">
            <Button type="button" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" disabled={submitting}>
              {submitting ? '创建中...' : '创建并生成 Token'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ApplicationDetailDrawer({
  detail,
  createdToken,
  loading,
  onClose,
  onRefresh,
  onTokenCreated,
  onTokenRevoked,
  onDeleteData,
}: {
  detail: SelectedApplication;
  createdToken: IngestToken | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onTokenCreated: (token: IngestToken) => Promise<void>;
  onTokenRevoked: (tokenId: string) => Promise<void>;
  onDeleteData: () => void;
}) {
  const [tokenPurpose, setTokenPurpose] = useState<TokenPurposeKey>('default');
  const [tokenName, setTokenName] = useState<string>(tokenPurposeOptions[0].name);
  const [submitting, setSubmitting] = useState(false);
  const { application, tokens } = detail;
  const activeTokenCount = tokens.filter(token => !token.revokedAt).length;
  const hasActiveDefaultToken = tokens.some(
    token => !token.revokedAt && token.name === tokenPurposeOptions[0].name
  );

  useEffect(() => {
    setTokenPurpose('default');
    setTokenName(tokenPurposeOptions[0].name);
  }, [application.id]);

  function selectTokenPurpose(option: (typeof tokenPurposeOptions)[number]) {
    setTokenPurpose(option.key);
    setTokenName(option.name);
  }

  async function generateToken() {
    const nextName = tokenName.trim();
    if (!nextName) return;
    setSubmitting(true);
    try {
      const response = await createToken(application.id, nextName);
      await onTokenCreated(response.token);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="detail-drawer" aria-label="应用详情">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">应用详情</span>
            <h2>{application.name}</h2>
            <code>{application.slug}</code>
          </div>
          <div className="actions">
            <Button type="button" onClick={onRefresh}>
              刷新
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
        <div className="drawer-content">
          {loading ? <LoadingState label="正在加载详情..." /> : null}
          <div className="drawer-section">
            <h3>基本信息</h3>
            <dl className="definition-list">
              <div>
                <dt>应用名称</dt>
                <dd>{application.name}</dd>
              </div>
              <div>
                <dt>App ID</dt>
                <dd>{application.slug}</dd>
              </div>
              <div>
                <dt>默认环境</dt>
                <dd>{application.defaultEnvironment}</dd>
              </div>
              <div>
                <dt>平台</dt>
                <dd>{application.platforms.length ? application.platforms.join(', ') : '-'}</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>{application.status === 'active' ? '启用' : '停用'}</dd>
              </div>
              <div>
                <dt>描述</dt>
                <dd>{application.description || '-'}</dd>
              </div>
            </dl>
          </div>
          <div className="drawer-section">
            <div className="section-header">
              <div>
                <h3>Token 管理</h3>
                <p>完整 Token 只在生成后显示一次，已吊销 Token 不能继续上报。</p>
              </div>
            </div>
            <div className="token-form" aria-label="添加 Token">
              <div className="token-form-field">
                <span>Token 用途</span>
                <div className="token-purpose-options" role="group" aria-label="Token 用途">
                  {tokenPurposeOptions.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      className={`token-purpose-option ${tokenPurpose === option.key ? 'is-active' : ''}`}
                      onClick={() => selectTokenPurpose(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="token-form-field">
                <span>Token 名称</span>
                <input
                  value={tokenName}
                  onChange={event => setTokenName(event.target.value)}
                  aria-label="Token 名称"
                  placeholder={
                    tokenPurpose === 'custom' ? '例如 Partner A ingest token' : undefined
                  }
                />
              </label>
              {activeTokenCount > 0 && tokenPurpose === 'default' ? (
                <p className="token-form-hint">
                  {hasActiveDefaultToken
                    ? '当前已有有效默认 Token。通常一个应用只需要一个默认 Token；新增 Token 更适合轮换、分端或测试。'
                    : '当前已有有效 Token。新增默认 Token 适合轮换；iOS、Android 或测试用途建议选择对应标签。'}
                </p>
              ) : null}
              <div className="actions">
                <Button
                  type="button"
                  variant="primary"
                  disabled={submitting}
                  onClick={generateToken}
                >
                  {submitting ? '生成中...' : activeTokenCount ? '添加 Token' : '生成 Token'}
                </Button>
              </div>
            </div>
            {createdToken?.plainText ? <TokenRevealPanel token={createdToken} /> : null}
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>前缀</th>
                    <th>创建时间</th>
                    <th>最近使用</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(token => (
                    <tr key={token.id}>
                      <td>{token.name}</td>
                      <td>
                        <code>{token.prefix}</code>
                      </td>
                      <td>{token.createdAt ? new Date(token.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : '-'}
                      </td>
                      <td>
                        <span
                          className={`badge ${token.revokedAt ? 'status-disabled' : 'status-active'}`}
                        >
                          {token.revokedAt ? '已吊销' : '有效'}
                        </span>
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={Boolean(token.revokedAt)}
                          onClick={() => void onTokenRevoked(token.id)}
                        >
                          吊销
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="drawer-section">
            <h3>接入配置</h3>
            <p className="muted">
              App 端需要配置 App ID、上报地址、Ingest Token 和环境；完整说明见
              docs/app-integration.md。
            </p>
            <IntegrationSnippet appId={application.slug} token={createdToken?.plainText} />
          </div>
          <div className="drawer-section danger-zone">
            <div>
              <h3>危险操作</h3>
              <p>删除应用和数据会清理该 App ID 下的事件与问题，执行前需要输入完整 App ID。</p>
            </div>
            <Button type="button" variant="danger" onClick={onDeleteData}>
              删除应用和数据
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DeleteApplicationDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [confirmAppId, setConfirmAppId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDataDelete = target.mode === 'data';

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (isDataDelete) {
        await deleteApplicationWithData(target.application.id, confirmAppId);
      } else {
        await deleteApplication(target.application.id);
      }
      await onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label="删除应用">
        <div className="card-header">
          <div>
            <h2>{isDataDelete ? '删除应用和数据' : '删除应用注册'}</h2>
            <p>
              {isDataDelete
                ? '会删除应用、Token、事件和问题。'
                : '只删除应用和 Token，历史事件与问题会保留。'}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
        <div className="app-form">
          <p>
            目标应用：<strong>{target.application.name}</strong>{' '}
            <code>{target.application.slug}</code>
          </p>
          {isDataDelete ? (
            <label>
              输入完整 App ID 确认
              <input
                value={confirmAppId}
                onChange={event => setConfirmAppId(event.target.value)}
                placeholder={target.application.slug}
              />
            </label>
          ) : null}
          {error ? <p className="login-error">{error}</p> : null}
          <div className="actions">
            <Button type="button" onClick={onClose}>
              取消
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={submitting || (isDataDelete && confirmAppId !== target.application.slug)}
              onClick={() => void submit()}
            >
              {submitting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DisableApplicationDialog({
  application,
  submitting,
  onClose,
  onConfirm,
}: {
  application: ApplicationSummary;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label="停用应用">
        <div className="card-header">
          <div>
            <h2>停用应用？</h2>
            <p>停用后，该应用将不再接受应用级 Token 上报。</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
        <div className="app-form">
          <div className="warning-panel">
            <p>当前有效 Token 会被吊销，历史事件和问题会保留。</p>
            <p>如需恢复上报，需要重新启用应用并生成新的 Token。</p>
          </div>
          <dl className="definition-list">
            <div>
              <dt>应用</dt>
              <dd>{application.name}</dd>
            </div>
            <div>
              <dt>App ID</dt>
              <dd>
                <code>{application.slug}</code>
              </dd>
            </div>
          </dl>
          <div className="actions">
            <Button type="button" onClick={onClose}>
              取消
            </Button>
            <Button type="button" variant="warning" disabled={submitting} onClick={onConfirm}>
              {submitting ? '停用中...' : '确认停用'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function TokenRevealPanel({ token }: { token: IngestToken }) {
  return (
    <div className="token-panel">
      <div>
        <h4>新生成的完整 Token</h4>
        <p>只显示这一次。关闭详情、刷新页面或重新进入后，只会保留前缀，无法再查看完整值。</p>
      </div>
      <div className="token-copy-row">
        <code className="token-value">{token.plainText}</code>
        <CopyButton value={token.plainText ?? ''} label="复制 Token" />
      </div>
    </div>
  );
}

function IntegrationSnippet({ appId, token }: { appId: string; token?: string }) {
  const safeToken = token || 'ah_ingest_xxx';
  const snippet = `<AppHealthProvider
  appId="${appId}"
  endpoint="${apiBaseUrl}/api/app-health/events"
  token="${safeToken}"
  environment="production"
/>`;
  const curl = `curl -X POST ${apiBaseUrl}/api/app-health/events \\
  -H 'authorization: Bearer ${safeToken}' \\
  -H 'content-type: application/json' \\
  --data '{"events":[{"id":"evt_smoke_001","type":"custom","level":"info","timestamp":1710000000000,"app":{"id":"${appId}"},"session":{"id":"sess_smoke","startedAt":1710000000000}}]}'`;

  return (
    <div className="setup-preview">
      <div>
        <h3>React Native 初始化配置</h3>
        <pre>{snippet}</pre>
        <CopyButton value={snippet} label="复制 SDK 片段" />
      </div>
      <div>
        <h3>curl 冒烟命令</h3>
        <pre>{curl}</pre>
        <CopyButton value={curl} label="复制 curl" />
      </div>
    </div>
  );
}

function CopyButton({ value, label = '复制 Token' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button type="button" onClick={() => void copy()}>
      {copied ? '已复制' : label}
    </Button>
  );
}
