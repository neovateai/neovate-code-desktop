// Renderer process IPC utilities for typesafe communication
/** biome-ignore-all lint/suspicious/noExplicitAny: use any */
import type {
  CreateMainCaller,
  MainHandlers,
  RendererHandlers,
  RendererHandlersListener,
} from './types';

/**
 * Call handlers in the main process
 *
 * @example
 * export const ipcMainCaller = createMainCaller<typeof mainHandlers>({
 *   ipcInvoke: window.electron.ipcRenderer.invoke,
 * });
 *
 * // Call with two-level nesting
 * const { url } = await ipcMainCaller.server.create();
 * await ipcMainCaller.file.save({ path: '/tmp/file.txt' });
 */
export function createMainCaller<TMainHandlers extends MainHandlers>({
  ipcInvoke,
}: {
  ipcInvoke: Electron.IpcRenderer['invoke'];
}) {
  return new Proxy<CreateMainCaller<TMainHandlers>>({} as any, {
    get: (_, namespace) => {
      if (namespace === Symbol.toStringTag) return 'IPCMainCaller';
      return new Proxy({} as any, {
        get: (__, method) => {
          const channelName = `${namespace.toString()}.${method.toString()}`;
          return (input: any) => {
            return ipcInvoke(channelName, input);
          };
        },
      });
    },
  });
}

/**
 * Receive events from the main process
 *
 * @example
 * export const ipcRendererHandler = createRendererHandler<RendererHandlers>({
 *   on: (channel, callback) => window.electron.ipcRenderer.on(channel, callback),
 *   send: window.electron.ipcRenderer.send,
 * });
 *
 * // Fire-and-forget from main
 * useEffect(() => {
 *   const unlisten = ipcRendererHandler.notification.show.listen((message) => {
 *     console.log(message);
 *   });
 *   return unlisten;
 * }, []);
 *
 * // Request-response (return value to main)
 * useEffect(() => {
 *   const unlisten = ipcRendererHandler.math.add.handle((a, b) => a + b);
 *   return unlisten;
 * }, []);
 */
export const createRendererHandler = <T extends RendererHandlers>({
  on,
  send,
}: {
  on: (
    channel: string,
    handler: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => () => void;
  send: Electron.IpcRenderer['send'];
}) =>
  new Proxy<RendererHandlersListener<T>>({} as any, {
    get: (_, namespace) => {
      if (namespace === Symbol.toStringTag) return 'IPCRendererHandler';
      return new Proxy({} as any, {
        get: (__, method) => {
          const channelName = `${namespace.toString()}.${method.toString()}`;
          return {
            // Listen for fire-and-forget messages from main (one-way: main -> renderer)
            listen: (handler: any) =>
              on(`send:${channelName}`, (_, ...args) => handler(...args)),

            // Handle request-response messages from main (two-way: main -> renderer -> main)
            handle: (handler: any) => {
              return on(
                `invoke:${channelName}`,
                async (__, id: string, ...args) => {
                  try {
                    const result = await handler(...args);
                    send(id, { result });
                  } catch (error) {
                    send(id, { error });
                  }
                },
              );
            },
          };
        },
      });
    },
  });
