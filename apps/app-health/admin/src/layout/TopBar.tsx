interface TopBarProps {
  appId: string;
  environment: string;
  timeRange: string;
  onAppIdChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}

export function TopBar({
  appId,
  environment,
  timeRange,
  onAppIdChange,
  onEnvironmentChange,
  onTimeRangeChange,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-controls">
        <label className="topbar-field">
          App
          <input
            value={appId}
            onChange={event => onAppIdChange(event.target.value)}
            placeholder="mobile-app"
          />
        </label>
        <label className="topbar-field">
          Environment
          <select value={environment} onChange={event => onEnvironmentChange(event.target.value)}>
            <option value="">All</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </label>
        <label className="topbar-field">
          Time range
          <select value={timeRange} onChange={event => onTimeRangeChange(event.target.value)}>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
        </label>
      </div>
      <div className="user-menu" aria-label="Current admin">
        <span className="avatar">A</span>
        <div>
          <strong>Admin</strong>
          <span>Token mode</span>
        </div>
      </div>
    </div>
  );
}
