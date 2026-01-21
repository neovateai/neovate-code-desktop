import { useEffect, useState } from 'react';
import { Loader2Icon, AlertCircleIcon, XIcon } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

interface ActivityIndicatorProps {
  sessionId: string | null;
}

function formatElapsedTime(startTime: number | null): string {
  if (!startTime) return '0s';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  if (elapsed < 60) return `${elapsed}s`;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m ${seconds}s`;
}

export function ActivityIndicator({ sessionId }: ActivityIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState('0s');

  const sessionProcessing = useStore((state) =>
    sessionId ? state.sessionProcessing[sessionId] : null,
  );
  const setSessionProcessing = useStore((state) => state.setSessionProcessing);

  const status = sessionProcessing?.status ?? 'idle';
  const processingStartTime = sessionProcessing?.processingStartTime ?? null;
  const processingToken = sessionProcessing?.processingToken ?? 0;
  const error = sessionProcessing?.error ?? null;
  const retryInfo = sessionProcessing?.retryInfo ?? null;

  // Update elapsed time every second when processing
  useEffect(() => {
    if (status !== 'processing' || !processingStartTime) {
      setElapsedTime('0s');
      return;
    }

    // Initial update
    setElapsedTime(formatElapsedTime(processingStartTime));

    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(processingStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, processingStartTime]);

  const handleDismissError = () => {
    if (sessionId) {
      setSessionProcessing(sessionId, {
        status: 'idle',
        error: null,
      });
    }
  };

  // Don't render anything if idle
  if (status === 'idle') {
    return null;
  }

  // Render failed state
  if (status === 'failed') {
    return (
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm"
        style={{
          backgroundColor: 'var(--bg-danger-subtle, #fef2f2)',
          color: 'var(--text-danger, #dc2626)',
          border: '1px solid var(--border-danger, #fecaca)',
        }}
      >
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error || 'An error occurred'}</span>
        </div>
        <button
          onClick={handleDismissError}
          className="p-1 rounded hover:bg-red-100 transition-colors"
          aria-label="Dismiss error"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    );
  }

  // Render processing state
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <Loader2Icon className="size-4 animate-spin shrink-0" />
      <div className="flex items-center gap-2 flex-1">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Processing...
        </span>
        <span>{elapsedTime}</span>
        {processingToken > 0 && (
          <span
            className="flex items-center gap-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>↓</span>
            <span>{processingToken} tokens</span>
          </span>
        )}
        {retryInfo && (
          <span
            className={cn(
              'flex items-center gap-1',
              retryInfo.error ? 'text-amber-600' : '',
            )}
          >
            <span>•</span>
            <span>
              Retry {retryInfo.currentRetry}/{retryInfo.maxRetries}
            </span>
            {retryInfo.error && (
              <span className="text-xs">({retryInfo.error})</span>
            )}
          </span>
        )}
      </div>
      <span
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Esc to cancel
      </span>
    </div>
  );
}
