interface TopBarProps {
  appId: string;
  environment: string;
  timeRange: string;
  userEmail?: string;
  onLogout?: () => void;
  onAppIdChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}

export function TopBar({
  appId,
  environment,
  timeRange,
  userEmail,
  onLogout,
  onAppIdChange,
  onEnvironmentChange,
  onTimeRangeChange,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-controls">
        <label className="topbar-field">
          应用
          <input
            value={appId}
            onChange={event => onAppIdChange(event.target.value)}
            placeholder="mobile-app"
          />
        </label>
        <label className="topbar-field">
          环境
          <select value={environment} onChange={event => onEnvironmentChange(event.target.value)}>
            <option value="">全部</option>
            <option value="production">生产</option>
            <option value="staging">预发</option>
            <option value="development">开发</option>
          </select>
        </label>
        <label className="topbar-field">
          时间范围
          <select value={timeRange} onChange={event => onTimeRangeChange(event.target.value)}>
            <option value="1h">最近 1 小时</option>
            <option value="24h">最近 24 小时</option>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
          </select>
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
