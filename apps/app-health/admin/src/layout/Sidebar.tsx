import type { Page } from '../app/App';

interface NavItem {
  id: Page;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: '总览' },
  { id: 'applications', label: '应用管理' },
  { id: 'issues', label: '问题' },
  { id: 'events', label: '事件' },
  { id: 'alerts', label: '告警', badge: '测试版' },
  { id: 'settings', label: '设置' },
];

export function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <div className="brand-mark">AH</div>
        <div>
          <strong>App Health</strong>
          <span>管理后台</span>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="主导航">
        {navItems.map(item => (
          <button
            key={item.id}
            className={item.id === activePage ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.label}</span>
            {item.badge ? <small>{item.badge}</small> : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span>自托管监控</span>
        <strong>rn-health</strong>
      </div>
    </aside>
  );
}
