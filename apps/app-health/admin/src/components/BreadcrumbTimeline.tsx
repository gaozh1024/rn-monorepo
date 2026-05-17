import type { HealthEvent } from '../api/types';

export function BreadcrumbTimeline({
  breadcrumbs = [],
}: {
  breadcrumbs?: HealthEvent['breadcrumbs'];
}) {
  if (!breadcrumbs.length) return <p className="muted">No breadcrumbs.</p>;
  return (
    <ol className="timeline">
      {breadcrumbs.map((breadcrumb, index) => (
        <li key={`${breadcrumb.timestamp ?? index}-${breadcrumb.message}`}>
          <strong>{breadcrumb.category ?? 'event'}</strong>
          <span>{breadcrumb.message}</span>
        </li>
      ))}
    </ol>
  );
}
