/**
 * @fileoverview Typesafe IPC (ipc) - End-to-end type safety for Electron IPC
 *
 * A lightweight, tRPC-inspired library for typesafe bidirectional IPC communication
 * between Electron main and renderer processes.
 *
 * ## Features
 * - End-to-end type safety from main → preload → renderer
 * - Automatic type inference from function signatures
 * - IDE autocomplete for all IPC methods
 * - Single source of truth for all IPC contracts
 * - Bidirectional communication (renderer ↔ main)
 * - Zero runtime overhead (pure TypeScript)
 *
 * ## Quick Start
 *
 * ### 1. Define handlers in main process:
 * ```typescript
 * // src/main/ipc/index.ts
 * import { createMainHandler } from '@/shared/lib/ipc';
 *
 * export const mainHandlers = {
 *   createServer: createMainHandler(async () => {
 *     const server = await startServer();
 *     return { url: server.url };
 *   }),
 *
 *   saveFile: createMainHandler<{ path: string }>(async ({ input }) => {
 *     await fs.writeFile(input.path, data);
 *     return { success: true };
 *   }),
 * } as const;
 * ```
 *
 * ### 2. Register handlers:
 * ```typescript
 * // src/main/main.ts
 * import { registerMainHandlers } from '@/shared/lib/ipc';
 * import { mainHandlers } from './ipc';
 *
 * registerMainHandlers(mainHandlers);
 * ```
 *
 * ### 3. Create caller in renderer:
 * ```typescript
 * // src/renderer/ipc/caller.ts
 * import { createMainCaller } from '@/shared/lib/ipc';
 * import { mainHandlers } from '@/main/ipc';
 *
 * export const ipcMainCaller = createMainCaller<typeof mainHandlers>({
 *   ipcInvoke: window.electron.ipcRenderer.invoke,
 * });
 * ```
 *
 * ### 4. Use in React components:
 * ```typescript
 * const { url } = await ipcMainCaller.createServer(); // Typed!
 * await ipcMainCaller.saveFile({ path: '/tmp/file.txt' }); // Typed!
 * ```
 *
 * ## Architecture
 *
 * **Renderer → Main (Request-Response)**
 * 1. Renderer calls `ipcMainCaller.methodName(input)`
 * 2. Proxy intercepts and calls `ipcRenderer.invoke('methodName', input)`
 * 3. Main process handler receives via `ipcMain.handle('methodName')`
 * 4. Result returns as typed Promise
 *
 * **Main → Renderer (Events)**
 * 1. Main calls `ipcRendererCaller.methodName.send(data)` (fire-and-forget)
 *    or `await ipcRendererCaller.methodName.invoke(data)` (request-response)
 * 2. Renderer listens via `ipcRendererHandler.methodName.listen(callback)`
 *    or handles via `ipcRendererHandler.methodName.handle(callback)`
 *
 * @module ipc
 */

export * from './main';
export * from './renderer';
export * from './types';
