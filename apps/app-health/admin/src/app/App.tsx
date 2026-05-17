import { useState } from 'react';
import { EventsPage } from '../pages/EventsPage';
import { IssueDetailPage } from '../pages/IssueDetailPage';
import { IssuesPage } from '../pages/IssuesPage';
import { StatsPage } from '../pages/StatsPage';

type Page = 'stats' | 'issues' | 'events';

export function App() {
  const [page, setPage] = useState<Page>('stats');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  if (selectedIssueId) {
    return <IssueDetailPage issueId={selectedIssueId} onBack={() => setSelectedIssueId(null)} />;
  }

  return (
    <main>
      <header>
        <div>
          <h1>App Health Admin</h1>
          <p>Self-hosted issue and event explorer for rn-health.</p>
        </div>
        <nav>
          <button onClick={() => setPage('stats')}>Stats</button>
          <button onClick={() => setPage('issues')}>Issues</button>
          <button onClick={() => setPage('events')}>Events</button>
        </nav>
      </header>
      {page === 'stats' ? <StatsPage /> : null}
      {page === 'issues' ? <IssuesPage onSelectIssue={setSelectedIssueId} /> : null}
      {page === 'events' ? <EventsPage /> : null}
    </main>
  );
}
