export function StackTraceView({ stack }: { stack?: string }) {
  if (!stack) return <p className="muted">暂无堆栈信息。</p>;
  return <pre className="stack-trace">{stack}</pre>;
}
