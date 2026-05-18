import type { ReactNode } from 'react';
import type { Page } from '../app/App';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AdminLayoutProps {
  activePage: Page;
  appId: string;
  environment: string;
  timeRange: string;
  userEmail?: string;
  children: ReactNode;
  onLogout?: () => void;
  onNavigate: (page: Page) => void;
  onAppIdChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}

export function AdminLayout({
  activePage,
  appId,
  environment,
  timeRange,
  userEmail,
  children,
  onLogout,
  onNavigate,
  onAppIdChange,
  onEnvironmentChange,
  onTimeRangeChange,
}: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="admin-main">
        <TopBar
          appId={appId}
          environment={environment}
          timeRange={timeRange}
          userEmail={userEmail}
          onLogout={onLogout}
          onAppIdChange={onAppIdChange}
          onEnvironmentChange={onEnvironmentChange}
          onTimeRangeChange={onTimeRangeChange}
        />
        <main className="content-shell">{children}</main>
      </div>
    </div>
  );
}
