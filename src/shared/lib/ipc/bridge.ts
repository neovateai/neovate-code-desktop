/**
 * IPC Bridge Utilities
 *
 * Reduces boilerplate when bridging manager classes to IPC handlers.
 */

import { createMainHandler } from './main';

/**
 * Create a fully typed bridge that delegates to a manager instance.
 * Input/output types are inferred from the handler function signatures.
 *
 * @example
 * ```ts
 * // Before (verbose - 25 lines)
 * terminal: {
 *   create: createMainHandler<
 *     { cwd?: string; shell?: string; cols?: number; rows?: number },
 *     { ptyId: string }
 *   >(async ({ input }) => {
 *     const ptyId = ptyManager.create(input);
 *     return { ptyId };
 *   }),
 *   write: createMainHandler<{ ptyId: string; data: string }, void>(
 *     async ({ input }) => {
 *       ptyManager.write(input.ptyId, input.data);
 *     },
 *   ),
 *   // ... more handlers
 * }
 *
 * // After (concise - 10 lines)
 * terminal: createTypedBridge(ptyManager, {
 *   create: (m, input: PTYCreateOptions) => ({ ptyId: m.create(input) }),
 *   write: (m, input: { ptyId: string; data: string }) => m.write(input.ptyId, input.data),
 *   resize: (m, input: { ptyId: string; cols: number; rows: number }) =>
 *     m.resize(input.ptyId, input.cols, input.rows),
 *   destroy: (m, input: { ptyId: string }) => m.destroy(input.ptyId),
 * })
 * ```
 */
export function createTypedBridge<
  TManager,
  THandlers extends Record<string, (manager: TManager, input: any) => any>,
>(
  manager: TManager,
  handlers: THandlers,
): {
  [K in keyof THandlers]: THandlers[K] extends (
    m: TManager,
    input: infer TInput,
  ) => infer TOutput
    ? ReturnType<typeof createMainHandler<TInput, Awaited<TOutput>>>
    : never;
} {
  const result: Record<string, ReturnType<typeof createMainHandler>> = {};

  for (const [name, handlerFn] of Object.entries(handlers)) {
    result[name] = createMainHandler(async ({ input }) => {
      return handlerFn(manager, input);
    });
  }

  return result as any;
}
