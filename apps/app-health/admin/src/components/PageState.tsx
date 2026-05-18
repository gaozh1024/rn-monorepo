import { ConnectionErrorState } from './ConnectionErrorState';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <p className="state state-loading">
      <span className="spinner" />
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (/failed to fetch|request failed|load/i.test(message)) {
    return <ConnectionErrorState message={message} onRetry={onRetry} />;
  }
  return (
    <div className="state state-error" role="alert">
      <span>{message}</span>
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="state state-empty">{label}</p>;
}
