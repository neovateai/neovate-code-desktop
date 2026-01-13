// Type definitions for typesafe IPC communication
/** biome-ignore-all lint/suspicious/noExplicitAny: use any */

// Base types

/** Context provided to main process handlers, includes sender WebContents */
export interface MainHandlerContext {
  sender: Electron.WebContents;
}

/** Main handler function type for renderer-to-main IPC calls */
export type MainHandler<TInput = any, TOutput = any> = (args: {
  context: MainHandlerContext;
  input: TInput;
}) => Promise<TOutput>;

/** Handler function type for main-to-renderer IPC calls */
export type RendererHandler<TInput extends any[] = any[], TOutput = unknown> = (
  ...args: TInput
) => TOutput | Promise<TOutput>;

// Handler collections

/** Collection of main handlers organized by namespace and method */
export type MainHandlers = Record<
  string,
  Record<string, { handler: MainHandler }>
>;

/** Collection of renderer handlers organized by namespace and method */
export type RendererHandlers = Record<
  string,
  Record<string, (...args: any[]) => any>
>;

// Helper function type
export type CreateMainHandlerFn = <TInput = void, TOutput = unknown>(
  handler: (args: {
    context: MainHandlerContext;
    input: TInput;
  }) => Promise<TOutput>,
) => { handler: MainHandler<TInput, TOutput> };

// Type inference utilities
type InferMainHandlerInput<T> = T extends MainHandler<infer TInput, any>
  ? TInput
  : never;

type InferMainHandlerOutput<T> = T extends MainHandler<any, infer TOutput>
  ? TOutput
  : never;

type InferRendererHandlerInput<T> = T extends RendererHandler<infer TInput, any>
  ? TInput
  : never;

type InferRendererHandlerOutput<T> = T extends RendererHandler<
  any[],
  infer TOutput
>
  ? TOutput
  : never;

// Caller types for main process
export type CreateMainCaller<TMainHandlers extends MainHandlers> = {
  [Namespace in keyof TMainHandlers]: {
    [Method in keyof TMainHandlers[Namespace]]: InferMainHandlerInput<
      TMainHandlers[Namespace][Method]['handler']
    > extends void
      ? () => Promise<
          InferMainHandlerOutput<TMainHandlers[Namespace][Method]['handler']>
        >
      : (
          input: InferMainHandlerInput<
            TMainHandlers[Namespace][Method]['handler']
          >,
        ) => Promise<
          InferMainHandlerOutput<TMainHandlers[Namespace][Method]['handler']>
        >;
  };
};

// Caller types for renderer process
export type GetRendererCaller<TRendererHandlers extends RendererHandlers> = {
  [Namespace in keyof TRendererHandlers]: {
    [Method in keyof TRendererHandlers[Namespace]]: {
      send: (
        ...args: InferRendererHandlerInput<TRendererHandlers[Namespace][Method]>
      ) => void;
      invoke: (
        ...args: InferRendererHandlerInput<TRendererHandlers[Namespace][Method]>
      ) => Promise<
        InferRendererHandlerOutput<TRendererHandlers[Namespace][Method]>
      >;
    };
  };
};

// Listener types for renderer process
export type RendererHandlersListener<T extends RendererHandlers> = {
  [Namespace in keyof T]: {
    [Method in keyof T[Namespace]]: {
      listen: (
        handler: (...args: Parameters<T[Namespace][Method]>) => void,
      ) => () => void;
      handle: (handler: T[Namespace][Method]) => () => void;
    };
  };
};
