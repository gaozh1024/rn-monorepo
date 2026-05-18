const labels: Record<string, string> = {
  open: '未处理',
  resolved: '已解决',
  ignored: '已忽略',
};

export function IssueStatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{labels[status] ?? status}</span>;
}
