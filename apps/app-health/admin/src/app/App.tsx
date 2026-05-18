import { useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { AlertsPage } from '../pages/AlertsPage';
import { ApplicationsPage } from '../pages/ApplicationsPage';
import { EventsPage } from '../pages/EventsPage';
import { IssueDetailPage } from '../pages/IssueDetailPage';
import { IssuesPage } from '../pages/IssuesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatsPage } from '../pages/StatsPage';

export type Page = 'overview' | 'applications' | 'issues' | 'events' | 'alerts' | 'settings';

export function App() {
  const [page, setPage] = useState<Page>('overview');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [appId, setAppId] = useState('mobile-app');
  const [environment, setEnvironment] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  if (selectedIssueId) {
    return (
      <AdminLayout
        activePage="issues"
        appId={appId}
        environment={environment}
        timeRange={timeRange}
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
