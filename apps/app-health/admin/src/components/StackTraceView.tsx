export function StackTraceView({ stack }: { stack?: string }) {
  if (!stack) return <p className="muted">No stack trace.</p>;
  return <pre className="stack-trace">{stack}</pre>;
}
