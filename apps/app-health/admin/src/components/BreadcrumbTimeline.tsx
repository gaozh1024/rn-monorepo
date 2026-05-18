import type { HealthEvent } from '../api/types';

export function BreadcrumbTimeline({
  breadcrumbs = [],
}: {
  breadcrumbs?: HealthEvent['breadcrumbs'];
}) {
  if (!breadcrumbs.length) return <p className="muted">暂无面包屑。</p>;
  return (
    <ol className="timeline">
      {breadcrumbs.map((breadcrumb, index) => (
        <li key={`${breadcrumb.timestamp ?? index}-${breadcrumb.message}`}>
          <strong>{breadcrumb.category ?? '事件'}</strong>
          <span>{breadcrumb.message}</span>
        </li>
      ))}
    </ol>
  );
}
