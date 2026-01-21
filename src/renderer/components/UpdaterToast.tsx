import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  CircleFadingArrowUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ipcMainCaller, ipcRendererHandler } from '../lib/ipc';
import type { UpdaterState } from '../../shared/types/updater';

export function UpdaterToast() {
  const [state, setState] = useState<UpdaterState>({ status: 'idle' });

  useEffect(() => {
    // Setup listeners for events from main
    const unsubs = [
      ipcRendererHandler.updater.checking.listen(() => {
        setState({ status: 'checking' });
      }),

      ipcRendererHandler.updater.upToDate.listen(() => {
        setState({ status: 'up-to-date' });
        // Auto-dismiss after 3 seconds, but only if still showing up-to-date
        setTimeout(() => {
          setState((current) =>
            current.status === 'up-to-date' ? { status: 'idle' } : current,
          );
        }, 3000);
      }),

      ipcRendererHandler.updater.updateAvailable.listen((version) => {
        setState({ status: 'available', version });
      }),

      ipcRendererHandler.updater.downloadProgress.listen((version, percent) => {
        setState({ status: 'downloading', version, percent });
      }),

      ipcRendererHandler.updater.updateReady.listen((version) => {
        setState({ status: 'ready', version });
      }),

      ipcRendererHandler.updater.error.listen((message) => {
        setState({ status: 'error', message });
      }),
    ];

    // Pull initial state (async) - only apply if still idle
    ipcMainCaller.updater.getState().then((initialState) => {
      setState((current) =>
        current.status === 'idle' ? initialState : current,
      );
    });

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const dismiss = () => {
    ipcMainCaller.updater.dismiss();
    setState({ status: 'idle' });
  };
  const download = () => ipcMainCaller.updater.download();
  const install = () => ipcMainCaller.updater.install();
  const retry = () => {
    ipcMainCaller.updater.check();
  };

  // Main's getState() already hides downloading state in auto mode
  if (state.status === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 transition-all duration-300 ease-out',
        'translate-y-0 opacity-100',
      )}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-popover px-4 py-2.5 text-popover-foreground shadow-lg min-w-[280px]">
        <ToastContent
          state={state}
          onDismiss={dismiss}
          onDownload={download}
          onInstall={install}
          onRetry={retry}
        />
      </div>
    </div>
  );
}

function ToastContent({
  state,
  onDismiss,
  onDownload,
  onInstall,
  onRetry,
}: {
  state: UpdaterState;
  onDismiss: () => void;
  onDownload: () => void;
  onInstall: () => void;
  onRetry: () => void;
}) {
  switch (state.status) {
    case 'checking':
      return (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className="text-sm flex-1">Checking for updates...</span>
        </>
      );

    case 'up-to-date':
      return (
        <>
          <CheckCircle2 className="size-4 shrink-0 text-green-500" />
          <span className="text-sm flex-1">You're up to date</span>
        </>
      );

    case 'available':
      return (
        <>
          <CircleFadingArrowUp className="size-4 shrink-0" />
          <span className="text-sm flex-1">
            Update available · {state.version}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="xs" onClick={onDismiss}>
              Later
            </Button>
            <Button size="xs" onClick={onDownload}>
              Download
            </Button>
          </div>
        </>
      );

    case 'downloading':
      return (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm">Downloading · {state.version}</span>
              <span className="text-xs text-muted-foreground">
                {state.percent.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${state.percent}%` }}
              />
            </div>
          </div>
        </>
      );

    case 'ready':
      return (
        <>
          <CircleFadingArrowUp className="size-4 shrink-0" />
          <span className="text-sm flex-1">
            Update available · {state.version}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="xs" onClick={onDismiss}>
              Later
            </Button>
            <Button size="xs" onClick={onInstall}>
              Restart
            </Button>
          </div>
        </>
      );

    case 'error':
      return (
        <>
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <span className="text-sm flex-1">Update failed</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="xs" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button size="xs" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </>
      );

    default:
      return null;
  }
}
