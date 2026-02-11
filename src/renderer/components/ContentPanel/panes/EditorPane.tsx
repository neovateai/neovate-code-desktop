import { useEffect, useRef, useState } from 'react';
import { ipcMainCaller, ipcRendererHandler } from '../../../lib/ipc';
import { logger } from '../../../lib/logger';
import { useContentPanelContext } from '../ContentPanelProvider';
import type { EditorTab } from '../types';
import { useStore } from '../../../store';

type EditorStatus = 'idle' | 'starting' | 'ready' | 'error';

interface EditorPaneProps {
  tab: EditorTab;
  isActive: boolean;
}

function LoadingState({ status }: { status: EditorStatus }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-background">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
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
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-background">
      <p className="text-sm text-red-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm rounded-md bg-card text-foreground border border-border"
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
  const pendingTabUri = useStore((s) => s.pendingTabUri);
  const { request } = useStore();
  const setPendingTabRequest = useStore((s) => s.setPendingTabRequest);
  const theme = useStore((state) => state.theme);
  const [extensionReady, setExtensionReady] = useState(false);

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

  // 文件打开行为承接
  useEffect(() => {
    if (pendingTabUri?.type === 'editor') {
      const uri = pendingTabUri.uri;
      // anchor request from search panel
      if (uri.includes(`#L`)) {
        // 解析文件名#L1 格式，提取行号
        const hashMatch = uri.match(/^(.+?)#L(\d+)$/);
        if (hashMatch) {
          const [, filePath, line] = hashMatch;
          request<any>('editor.open', {
            cwd: repoPath,
            filePath,
            line: parseInt(line, 10),
          });
          return;
        }
      }
      // diff request from git panel
      if (uri.includes(`diff://`)) {
        const diffPath = uri.replace('diff://', '');
        request<any>('editor.diff', { cwd: repoPath, filePath: diffPath });
        return;
      }
      request<any>('editor.open', { cwd: repoPath, filePath: uri });
    }
  }, [pendingTabUri]);

  useEffect(() => {
    if (extensionReady) {
      request<any>('editor.theme.set', { cwd: repoPath, theme });
    }
  }, [theme, extensionReady]);

  useEffect(() => {
    const unsubs = [
      // editor extension 劫持了https 链接，使用内置browser打开
      ipcRendererHandler.browser.open.listen((url) => {
        setPendingTabRequest({ type: 'browser', uri: url, repoPath });
      }),
      // 插件就绪
      ipcRendererHandler.extension.ready.listen(() => {
        setExtensionReady(true);
      }),
    ];
    return () => {
      unsubs.forEach((fn) => {
        fn();
      });
    };
  }, []);

  useEffect(() => {
    if (initRef.current && status === 'ready') return;
    initRef.current = true;
    startEditor();
  }, []);

  // Focus iframe when active
  useEffect(() => {
    if (isActive && status === 'ready' && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isActive, status]);

  const renderHolder = () => {
    if (!isActive) {
      return null;
    }
    if (status === 'error' && error) {
      return <ErrorState message={error} onRetry={startEditor} />;
    }
    if (status !== 'ready' || !serverUrl) {
      return <LoadingState status={status} />;
    }
  };

  return (
    <>
      {renderHolder()}
      {!!serverUrl && (
        <iframe
          ref={iframeRef}
          src={serverUrl}
          title="Code Editor"
          className={`flex-1 w-full h-full border-0 bg-background min-h-0 ${isActive ? 'block' : 'hidden'}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      )}
    </>
  );
}
