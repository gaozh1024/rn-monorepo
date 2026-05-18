import { useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { AlertsPage } from '../pages/AlertsPage';
import { ApplicationsPage } from '../pages/ApplicationsPage';
import { EventsPage } from '../pages/EventsPage';
import { IssueDetailPage } from '../pages/IssueDetailPage';
import { IssuesPage } from '../pages/IssuesPage';
import { LoginPage } from '../pages/LoginPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatsPage } from '../pages/StatsPage';
import { AuthProvider, useAuth } from './AuthProvider';

export type Page = 'overview' | 'applications' | 'issues' | 'events' | 'alerts' | 'settings';

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const auth = useAuth();
  const [page, setPage] = useState<Page>('overview');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [appId, setAppId] = useState('mobile-app');
  const [environment, setEnvironment] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  if (auth.loading) {
    return (
      <main className="login-page">
        <section className="login-card login-card-compact">
          <div className="spinner" />
          <h1>正在检查登录状态</h1>
          <p>正在连接 App Health Service，请稍候。</p>
        </section>
      </main>
    );
  }

  if (!auth.user) {
    return <LoginPage />;
  }

  const handleLogout = () => {
    void auth.logout();
  };

  if (selectedIssueId) {
    return (
      <AdminLayout
        activePage="issues"
        appId={appId}
        environment={environment}
        timeRange={timeRange}
        userEmail={auth.user.email}
        onLogout={handleLogout}
        onNavigate={nextPage => {
          setSelectedIssueId(null);
          setPage(nextPage);
        }}
        onAppIdChange={setAppId}
        onEnvironmentChange={setEnvironment}
        onTimeRangeChange={setTimeRange}
      >
        <IssueDetailPage issueId={selectedIssueId} onBack={() => setSelectedIssueId(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activePage={page}
      appId={appId}
      environment={environment}
      timeRange={timeRange}
      userEmail={auth.user.email}
      onLogout={handleLogout}
      onNavigate={setPage}
      onAppIdChange={setAppId}
      onEnvironmentChange={setEnvironment}
      onTimeRangeChange={setTimeRange}
    >
      {page === 'overview' ? <StatsPage appId={appId} /> : null}
      {page === 'applications' ? <ApplicationsPage appId={appId} /> : null}
      {page === 'issues' ? <IssuesPage appId={appId} onSelectIssue={setSelectedIssueId} /> : null}
      {page === 'events' ? <EventsPage appId={appId} environment={environment} /> : null}
      {page === 'alerts' ? <AlertsPage appId={appId} /> : null}
      {page === 'settings' ? <SettingsPage /> : null}
    </AdminLayout>
  );
}
