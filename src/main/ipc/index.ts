import { createMainHandler } from '../../shared/lib/ipc/main';
import { codeServerManager } from '../code-server';
import { ptyManager } from '../pty';
import { neovateServerManager } from '../server';
import { updaterService } from '../updater';
import {
  saveTerminalState,
  loadTerminalState,
  deleteTerminalState,
  getPtyCwd,
  type PersistedTerminalState,
} from '../terminal-state';

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

  codeServer: {
    start: createMainHandler<{ folderPath?: string }, { url: string }>(
      async () => {
        const instance = await codeServerManager.start();
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
};
