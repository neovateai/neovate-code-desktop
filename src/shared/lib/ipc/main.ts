// Main process IPC utilities for typesafe communication
/** biome-ignore-all lint/suspicious/noExplicitAny: use any */
import { ipcMain } from 'electron';
import crypto from 'node:crypto';
import type {
  AnyFunction,
  CreateMainHandlerFn,
  GetRendererCaller,
  MainHandlerContext,
  MainHandlers,
  MainHandlersOf,
  RendererHandlers,
} from './types';

/**
 * Define a handler that the renderer can call
 *
 * @example
 * // No input
 * const getStatus = createMainHandler(async () => ({ status: 'running' }));
 *
 * // With input
 * const saveFile = createMainHandler<{ path: string }>(async ({ input }) => {
 *   await fs.writeFile(input.path, data);
 *   return { success: true };
 * });
 *
 * // With context (access sender window)
 * const getWindowId = createMainHandler(async ({ context }) => {
 *   return { id: context.sender.id };
 * });
 */
export const createMainHandler: CreateMainHandlerFn = (fn) => {
  return { handler: fn };
};

/**
 * Register all MainHandlers with Electron's IPC system
 *
 * Call once at startup. Handlers are registered as "namespace.method" channels.
 *
 * @param mainHandlers - Object containing all handlers organized by namespace
 * @example
 * registerMainHandlers(mainHandlers);
 * // Registers: "server.create", "file.save", etc.
 */
export function registerMainHandlers(mainHandlers: MainHandlers): void {
  for (const [namespace, methods] of Object.entries(mainHandlers)) {
    for (const [method, { handler }] of Object.entries(methods)) {
      const channelName = `${namespace}.${method}`;
      ipcMain.handle(channelName, (e, payload) => {
        return handler({ context: { sender: e.sender }, input: payload });
      });
    }
  }
}

/**
 * Send events or invoke functions in the renderer
 *
 * @example
 * // Fire-and-forget (main -> renderer)
 * caller.notification.show.send('Hello!');
 *
 * // Request-response (main calls renderer, waits for result)
 * const result = await caller.math.add.invoke(5, 10);
 */
export function getRendererCaller<TRendererHandlers extends RendererHandlers>(
  contents: Electron.WebContents,
) {
  return new Proxy<GetRendererCaller<TRendererHandlers>>({} as any, {
    get: (_, namespace) => {
      if (namespace === Symbol.toStringTag) return 'IPCRendererCaller';
      return new Proxy({} as any, {
        get: (__, method) => {
          const channelName = `${namespace.toString()}.${method.toString()}`;
          return {
            // Fire-and-forget: main -> renderer (one-way)
            send: (...args: any[]) =>
              contents.send(`send:${channelName}`, ...args),

            // Request-response: main -> renderer -> main (two-way)
            invoke: async (...args: any[]) => {
              const id = crypto.randomUUID();

              return new Promise((resolve, reject) => {
                ipcMain.once(id, (_, { error, result }) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
                contents.send(`invoke:${channelName}`, id, ...args);
              });
            },
          };
        },
      });
    },
  });
}

/**
 * Expose class methods as IPC handlers.
 *
 * Methods receive { context, input } object where:
 * - context.sender: WebContents of the caller (for sending events back)
 * - input: The input payload from renderer (undefined if not provided)
 *
 * @param instance - The class instance (use `this` in instance property initializer)
 * @param methods - Array of method names to expose as handlers
 * @returns MainHandlersOf<T> - Object with handlers for IPC registration
 *
 * @example
 * // Define simple interface (input/output only)
 * interface IUpdaterIpcMethods {
 *   getState(): UpdaterState;
 *   check(): void;
 * }
 *
 * class UpdaterService implements WithIpcMainHandlers<IUpdaterIpcMethods> {
 *   private _check() { autoUpdater.checkForUpdates(); }
 *
 *   private startScheduledChecks() {
 *     this._check();
 *   }
 *
 *   // IPC handlers exposed to renderer
 *   mainHandlers = exposeAsMainHandlers(this, ['getState', 'check']);
 *   getState() { return this.state; }
 *   check() { this._check(); }
 * }
 *
 * // In ipc/index.ts
 * export const ipcMainHandlers = {
 *   updater: updaterService.mainHandlers,
 * };
 */
export function exposeAsMainHandlers<
  T extends Record<K, AnyFunction>,
  K extends keyof T,
>(instance: T, methods: K[]): MainHandlersOf<Pick<T, K>> {
  const result = {} as MainHandlersOf<Pick<T, K>>;

  for (const method of methods) {
    (result as any)[method] = {
      handler: async (args: {
        context: MainHandlerContext;
        input: unknown;
      }) => {
        // Pass { context, input } object directly - methods destructure what they need
        return instance[method].call(instance, args);
      },
    };
  }

  return result;
}
