export function RenderErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" style={{ padding: 20, textAlign: 'center' }}>
      <h2>Failed to load window</h2>
      <p style={{ color: 'red' }}>{message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
