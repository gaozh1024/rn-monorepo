export function IssueStatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{status}</span>;
}
