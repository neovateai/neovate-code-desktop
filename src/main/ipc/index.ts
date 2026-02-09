import { app, BrowserWindow, screen } from 'electron';
import {
  browserWindowManager,
  type WindowOpenOptions,
} from '../browser-window-manager';
import { createMainHandler } from '../../shared/lib/ipc/main';
import { codeServerManager } from '../code-server';
import { ptyManager } from '../pty';
import { neovateServerManager } from '../server';
import { computeEnsuredWindowWidth } from '../../shared/layout/windowSizing';
import {
  deleteTerminalState,
  getPtyCwd,
  loadTerminalState,
  type PersistedTerminalState,
  saveTerminalState,
} from '../terminal-state';
import { updaterService } from '../updater';

export const ipcMainHandlers = {
  neovateServer: {
    create: createMainHandler(async () => {
      const instance = await neovateServerManager.getOrCreate();
      return { url: instance.url };
    }),
  },

  terminal: {
    create: createMainHandler<
      { cwd?: string; shell?: string; cols?: number; rows?: number },
      { ptyId: string }
    >(async ({ input }) => {
      const ptyId = ptyManager.create(input);
      return { ptyId };
    }),

    write: createMainHandler<{ ptyId: string; data: string }, void>(
      async ({ input }) => {
        ptyManager.write(input.ptyId, input.data);
      },
    ),

    resize: createMainHandler<
      { ptyId: string; cols: number; rows: number },
      void
    >(async ({ input }) => {
      ptyManager.resize(input.ptyId, input.cols, input.rows);
    }),

    destroy: createMainHandler<{ ptyId: string }, void>(async ({ input }) => {
      ptyManager.destroy(input.ptyId);
    }),

    // Get current working directory of a PTY
    getCwd: createMainHandler<{ ptyId: string }, { cwd: string | null }>(
      async ({ input }) => {
        const pid = ptyManager.getPid(input.ptyId);
        if (!pid) {
          return { cwd: null };
        }
        const cwd = await getPtyCwd(pid);
        return { cwd };
      },
    ),

    // Save terminal state to disk
    saveState: createMainHandler<Omit<PersistedTerminalState, 'savedAt'>, void>(
      async ({ input }) => {
        await saveTerminalState({
          ...input,
          savedAt: Date.now(),
        });
      },
    ),

    // Load terminal state from disk
    loadState: createMainHandler<
      { repoPath: string; tabId: string },
      { state: PersistedTerminalState | null }
    >(async ({ input }) => {
      const state = await loadTerminalState(input.repoPath, input.tabId);
      return { state };
    }),

    // Delete terminal state from disk
    deleteState: createMainHandler<{ repoPath: string; tabId: string }, void>(
      async ({ input }) => {
        await deleteTerminalState(input.repoPath, input.tabId);
      },
    ),
  },

  updater: updaterService.mainHandlers,

  window: {
    open: createMainHandler<WindowOpenOptions, void>(async ({ input }) => {
      browserWindowManager.open(input);
    }),
    close: createMainHandler<{ windowId: string }, void>(async ({ input }) => {
      browserWindowManager.close(input.windowId);
    }),
    ensureWidth: createMainHandler<
      { minWidth: number },
      { appliedWidth: number; maxWidth: number }
    >(async ({ input }) => {
      const win =
        BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!win) return { appliedWidth: 0, maxWidth: 0 };

      const display = screen.getDisplayMatching(win.getBounds());
      const maxWidth = display.workAreaSize.width;
      const [curW, curH] = win.getSize();
      const [, minH] = win.getMinimumSize();
      const { target, appliedWidth } = computeEnsuredWindowWidth({
        currentWidth: curW,
        minWidth: input.minWidth,
        maxWidth,
      });

      win.setMinimumSize(target, minH);
      if (curW < target) {
        win.setSize(target, curH);
      }

      return { appliedWidth, maxWidth };
    }),
  },

  codeServer: {
    start: createMainHandler<{ folderPath?: string }, { url: string }>(
      async () => {
        const d1 = Date.now();
        const instance = await codeServerManager.start((p) => {
          console.log('[Code server downloading]', p);
          if (p.downloadedBytes === p.totalBytes) {
            console.log('[Code server downloaded, cost]', Date.now() - d1);
          }
        });

        return { url: instance.url };
      },
    ),

    getStatus: createMainHandler<
      void,
      { isRunning: boolean; url: string | null }
    >(async () => {
      return codeServerManager.getStatus();
    }),
  },

  app: {
    setLoginItemSettings: createMainHandler<{ openAtLogin: boolean }, void>(
      async ({ input }) => {
        app.setLoginItemSettings({
          openAtLogin: input.openAtLogin,
        });
      },
    ),

    getVersion: createMainHandler<void, { version: string }>(async () => {
      return { version: app.getVersion() };
    }),
  },
};

export type IPCMainHandlers = typeof ipcMainHandlers;

export type IPCRendererHandlers = {
  updater: {
    checking: () => void;
    upToDate: () => void;
    updateAvailable: (version: string) => void;
    downloadProgress: (version: string, percent: number) => void;
    updateReady: (version: string) => void;
    error: (message: string) => void;
  };
  browser: {
    open: (url: string) => void;
  };
  extension: {
    ready: () => void;
  };
};
