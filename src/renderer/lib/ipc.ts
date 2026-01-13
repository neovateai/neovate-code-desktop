import type { IPCMainHandlers } from '../../main/ipc';
import type { IPCRendererHandlers } from '../../main/ipc';
import {
  createMainCaller,
  createRendererHandler,
} from '../../shared/lib/ipc/renderer';

/** call main ipc in renderer */
export const ipcMainCaller = createMainCaller<IPCMainHandlers>({
  ipcInvoke: window.electron.ipcRenderer.invoke,
});

/** listen main call in renderer */
export const ipcRendererHandler = createRendererHandler<IPCRendererHandlers>({
  on: (channel: string, callback: (...args: any[]) => void) => {
    // @electron-toolkit/preload's on() returns a cleanup function
    return window.electron.ipcRenderer.on(channel, callback);
  },
  send: window.electron.ipcRenderer.send,
});
