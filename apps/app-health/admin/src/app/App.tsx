import { useEffect, useMemo, useState } from 'react';
import { listApplications } from '../api/applications';
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
import { createFallbackAppOption, toProjectAppOption } from './appScope';
import type { ProjectAppOption } from './appScope';

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
  const [applications, setApplications] = useState<ProjectAppOption[]>([]);
  const [environment, setEnvironment] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (!auth.user) return;

    async function loadApplications() {
      try {
        const response = await listApplications();
        const nextApplications = response.items.map(toProjectAppOption);
        setApplications(nextApplications);
        setAppId(currentAppId => {
          if (!nextApplications.length) return currentAppId;
          return nextApplications.some(application => application.appId === currentAppId)
            ? currentAppId
            : nextApplications[0].appId;
        });
      } catch (cause) {
        console.error(cause);
      }
    }

    void loadApplications();
  }, [auth.user]);

  const selectedApp = useMemo(
    () =>
      applications.find(application => application.appId === appId) ??
      createFallbackAppOption(appId),
    [appId, applications]
  );

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
        applications={applications}
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
      applications={applications}
      environment={environment}
      timeRange={timeRange}
      userEmail={auth.user.email}
      onLogout={handleLogout}
      onNavigate={setPage}
      onAppIdChange={setAppId}
      onEnvironmentChange={setEnvironment}
      onTimeRangeChange={setTimeRange}
    >
      {page === 'overview' ? <StatsPage app={selectedApp} /> : null}
      {page === 'applications' ? <ApplicationsPage /> : null}
      {page === 'issues' ? (
        <IssuesPage
          app={selectedApp}
          environment={environment}
          timeRange={timeRange}
          onSelectIssue={setSelectedIssueId}
        />
      ) : null}
      {page === 'events' ? <EventsPage app={selectedApp} environment={environment} /> : null}
      {page === 'alerts' ? <AlertsPage app={selectedApp} /> : null}
      {page === 'settings' ? <SettingsPage /> : null}
    </AdminLayout>
  );
}
