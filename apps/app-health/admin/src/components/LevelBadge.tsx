const labels: Record<string, string> = {
  fatal: '致命',
  error: '错误',
  warning: '警告',
  info: '信息',
};

export function LevelBadge({ level }: { level: string }) {
  return <span className={`badge level-${level}`}>{labels[level] ?? level}</span>;
}
