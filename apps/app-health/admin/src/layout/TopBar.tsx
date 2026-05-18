import type { ProjectAppOption } from '../app/appScope';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import type { DropdownOption } from '../components/ui/DropdownSelect';

interface TopBarProps {
  appId: string;
  applications: ProjectAppOption[];
  environment: string;
  timeRange: string;
  userEmail?: string;
  onLogout?: () => void;
  onAppIdChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}

const environmentOptions: DropdownOption[] = [
  { value: '', label: '全部' },
  { value: 'production', label: '生产' },
  { value: 'staging', label: '预发' },
  { value: 'development', label: '开发' },
];

const timeRangeOptions: DropdownOption[] = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

export function TopBar({
  appId,
  applications,
  environment,
  timeRange,
  userEmail,
  onLogout,
  onAppIdChange,
  onEnvironmentChange,
  onTimeRangeChange,
}: TopBarProps) {
  const appOptions = applications.length
    ? applications.map(application => ({
        value: application.appId,
        label: application.appName,
        description: `${application.projectName} · App ID: ${application.appId}`,
      }))
    : [
        {
          value: appId,
          label: appId,
          description: 'App Health',
        },
      ];

  return (
    <div className="topbar">
      <div className="topbar-controls">
        <label className="topbar-field">
          项目 / 应用
          <DropdownSelect
            className="app-scope-select"
            value={appId}
            options={appOptions}
            onChange={onAppIdChange}
          />
        </label>
        <label className="topbar-field">
          环境
          <DropdownSelect
            value={environment}
            options={environmentOptions}
            onChange={onEnvironmentChange}
          />
        </label>
        <label className="topbar-field">
          时间范围
          <DropdownSelect
            value={timeRange}
            options={timeRangeOptions}
            onChange={onTimeRangeChange}
          />
        </label>
      </div>
      <div className="user-menu" aria-label="当前管理员">
        <span className="avatar">管</span>
        <div>
          <strong>{userEmail ?? '管理员'}</strong>
          <span>{userEmail ? '已登录' : 'Token 模式'}</span>
        </div>
        {onLogout ? (
          <button className="user-logout" onClick={onLogout}>
            退出
          </button>
        ) : null}
      </div>
    </div>
  );
}
