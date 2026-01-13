import { createMainHandler } from '../../shared/lib/ipc/main';
import { ptyManager } from '../pty';
import { neovateServerManager } from '../server';

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
  },
};

export type IPCMainHandlers = typeof ipcMainHandlers;

export type IPCRendererHandlers = {
  demo: {
    helloFromMain: (message: string) => void;
  };
};
