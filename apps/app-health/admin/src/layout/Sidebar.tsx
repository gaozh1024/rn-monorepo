import type { Page } from '../app/App';

interface NavItem {
  id: Page;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications', badge: 'Soon' },
  { id: 'issues', label: 'Issues' },
  { id: 'events', label: 'Events' },
  { id: 'alerts', label: 'Alerts', badge: 'Beta' },
  { id: 'settings', label: 'Settings' },
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
          <span>Admin Console</span>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
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
        <span>Self-hosted monitor</span>
        <strong>rn-health</strong>
      </div>
    </aside>
  );
}
