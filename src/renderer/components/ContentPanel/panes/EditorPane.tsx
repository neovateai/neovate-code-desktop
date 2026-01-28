import { useState, useEffect, useRef } from 'react';
import { ipcMainCaller } from '../../../lib/ipc';
import { logger } from '../../../lib/logger';
import { useContentPanelContext } from '../ContentPanelProvider';
import type { EditorTab } from '../types';

type EditorStatus = 'idle' | 'starting' | 'ready' | 'error';

interface EditorPaneProps {
  tab: EditorTab;
  isActive: boolean;
}

function LoadingState({ status }: { status: EditorStatus }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-4"
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--text-tertiary)' }}
        />
        <p className="text-sm">
          {status === 'starting' ? 'Starting editor...' : 'Loading...'}
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-4"
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <p className="text-sm text-red-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm rounded-md"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        Retry
      </button>
    </div>
  );
}

export function EditorPane({ tab, isActive }: EditorPaneProps) {
  const { repoPath } = useContentPanelContext();
  const [status, setStatus] = useState<EditorStatus>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initRef = useRef(false);

  const startEditor = async () => {
    if (status === 'starting') return;

    setStatus('starting');
    setError(null);

    try {
      logger.debug('[EditorPane] Starting code-server...');
      const { url } = await ipcMainCaller.codeServer.start({
        folderPath: repoPath,
      });

      // Construct URL with folder query param
      const editorUrl = `${url}/?folder=${encodeURIComponent(repoPath)}`;
      logger.debug('[EditorPane] Server ready at:', editorUrl);

      setServerUrl(editorUrl);
      // FIXME: 不延迟的话有概率初始化失败
      setTimeout(() => {
        setStatus('ready');
      }, 100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start editor';
      logger.error('[EditorPane] Start failed:', message);
      setError(message);
      setStatus('error');
    }
  };

  // Start editor when pane becomes active
  useEffect(() => {
    if (!isActive) return;
    if (initRef.current && status === 'ready') return;

    initRef.current = true;
    startEditor();
  }, [isActive]);

  // Focus iframe when active
  useEffect(() => {
    if (isActive && status === 'ready' && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isActive, status]);

  if (!isActive) {
    return null;
  }

  if (status === 'error' && error) {
    return <ErrorState message={error} onRetry={startEditor} />;
  }

  if (status !== 'ready' || !serverUrl) {
    return <LoadingState status={status} />;
  }

  return (
    <iframe
      ref={iframeRef}
      src={serverUrl}
      title="Code Editor"
      className="flex-1 w-full h-full border-0"
      style={{
        backgroundColor: 'var(--bg-base)',
        minHeight: 0,
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    />
  );
}
