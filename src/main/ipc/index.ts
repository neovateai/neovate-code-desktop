import { createMainHandler } from '../../shared/lib/ipc/main';
import { neovateServerManager } from '../server';

export const ipcMainHandlers = {
  neovateServer: {
    create: createMainHandler(async () => {
      const instance = await neovateServerManager.getOrCreate();
      return { url: instance.url };
    }),
  },
};

export type IPCMainHandlers = typeof ipcMainHandlers;

export type IPCRendererHandlers = {
  demo: {
    helloFromMain: (message: string) => void;
  };
};
