export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <p className="state state-loading">{label}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
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
