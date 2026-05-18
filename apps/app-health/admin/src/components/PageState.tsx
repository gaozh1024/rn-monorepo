import { ConnectionErrorState } from './ConnectionErrorState';

export function LoadingState({ label = '正在加载...' }: { label?: string }) {
  return (
    <p className="state state-loading">
      <span className="spinner" />
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (/failed to fetch|request failed|load|加载失败/i.test(message)) {
    return <ConnectionErrorState message={message} onRetry={onRetry} />;
  }
  return (
    <div className="state state-error" role="alert">
      <span>{message}</span>
      {onRetry ? <button onClick={onRetry}>重试</button> : null}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="state state-empty">{label}</p>;
}
