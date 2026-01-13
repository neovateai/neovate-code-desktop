# Typesafe IPC Design

**Date:** 2026-01-12

## Discussion

### Primary Goals
- Prove the trpc pattern works for type-safe IPC
- Get type safety with IDE autocomplete now
- Test maintainability of the approach

### Scope Decisions
- **Single method POC**: Only `neovate-server:create`, not other IPC methods or WebSocket MessageBus
- This allows proving the pattern works before expanding to full migration

### Preload Integration Approach
- Use `@electron-toolkit/preload` as-is for minimal custom code
- Exposes `window.electron.ipcRenderer.invoke`, `.send`, `.on` for IPC

### Naming Conventions (from user feedback)
- **Router** → **MainHandlers** - main procedures for renderer to invoke
- **createClient** → **createMainCaller** - in renderer to call main
- **createRendererCaller** - in main to call renderer (keeps name)
- **createRendererHandler** - in renderer to handle events from main (keeps name)

### Builder Pattern Decision
- Question: Should we use chainable API like `t.procedure.input<T>().handler(fn)`?
- Decision: No, use simple function `createMainHandler<TInput>(fn)` for cleaner syntax
- Benefit: Less code to maintain, easier to understand

### Two-Level Nested Structure
- Question: Should we support nested namespaces like `mainCaller.namespace.method()`?
- Decision: Yes, but **limited to exactly two levels** for simplicity
- Structure: Both `mainCaller.namespace.method()` and `rendererHandler.namespace.method()` use two-level nesting
- Examples:
  - **MainHandlers** (renderer → main):
    - `mainCaller.server.create()` - Server-related operations
    - `mainCaller.file.save({ path })` - File operations
    - `mainCaller.workspace.addRepo({ path })` - Workspace operations
  - **RendererHandlers** (main → renderer):
    - `rendererHandler.notification.show.listen((msg) => ...)` - Notification events
    - `rendererCaller.math.add.invoke(5, 10)` - Math operations from main
- Benefits:
  - **Better organization** - Logical grouping by domain
  - **Cleaner API** - No need for prefixes like 'server:create' or 'server_create'
  - **Still simple** - No recursion, just one level of nesting
  - **TypeScript-friendly** - Easy type inference with two levels
  - **Consistency** - Both MainHandlers and RendererHandlers use the same pattern
- Implementation:
  - Handlers defined as nested objects: `{ namespace: { method: handler } }`
  - Channel names flattened with dots:
    - MainHandlers: `"namespace.method"`
    - RendererHandlers: `"send:namespace.method"` and `"invoke:namespace.method"`
  - Nested Proxies handle two-level property access
  - Registration flattens the structure automatically

### Input Type Specification
- Question: Should users have to type `context` parameter?
- Decision: No - context is automatically `MainHandlerContext`, users only specify input type
- `createMainHandler<TInput>()` - defaults to `void`, specify custom type when needed

### File Organization
- **src/shared/lib/tipc/** - Common utilities (types, main.ts, renderer.ts, index.ts)
- **src/main/ipc/index.ts** - IPC definitions (MainHandlers, RendererHandlers type)
- **src/main/tipc/main.ts** - Process-specific integration (register, createRendererCaller)
- **src/renderer/tipc/** - Process-specific instances (caller.ts, handler.ts)

### Context Parameter Requirement
- Question: Should MainHandlers have context?
- Decision: Yes - `ipcMain.handle` provides `IpcMainInvokeEvent` with `sender` access
- Handlers receive `{ context: { sender }, input }` pattern

## Context

The goal is to create a minimal trpc-inspired library for type-safe bidirectional IPC communication between Electron main and renderer processes. The library provides end-to-end type safety, automatic type inference, and clean API without requiring a procedure builder chain.

**Goals:**
- End-to-end type safety from main process → preload → renderer
- Automatic type inference from function signatures
- Support for bidirectional communication (renderer→main, main→renderer)
- Simple, builder-free API
- Minimal implementation (~120 lines of library code)

## Approach

Use **simple function-based API** with automatic type inference:
- `createMainHandler<TInput>(fn)` - Define main handler, specify input type, return type inferred
- `registerMainHandlers(handlers)` - Register in main process
- `createMainCaller()` - Call main from renderer
- `createRendererCaller()` - Call renderer from main
- `createRendererHandler()` - Handle main→renderer events

Type inference works by capturing function parameter/return types automatically, no manual type definitions needed.

## Architecture

The library is organized into 4 layers:

### Layer 1: Shared Library (`src/shared/lib/tipc/`)

Core type definitions and helper functions shared between main and renderer.

**types.ts** (~60 lines):
- `MainHandlerContext` - Provides `sender: WebContents` access
- `MainHandler<TInput, TOutput>` - Handler signature with context and input
- `RendererHandler<TInput, TOutput>` - Renderer procedure signature
- `CreateMainHandlerFn` - Type-safe function to create handlers
- `CreateMainCaller<TMainHandlers>` - Type for main caller in renderer
- `GetRendererCaller<TRendererHandlers>` - Type for renderer caller in main
- Type inference utilities: `InferMainHandlerInput`, `InferMainHandlerOutput`, etc.

**main.ts** (~15 lines):
```typescript
export const createMainHandler: CreateMainHandlerFn = (fn) => fn;

export function registerMainHandlers(mainHandlers: MainHandlers): void {
  for (const [name, handler] of Object.entries(mainHandlers)) {
    ipcMain.handle(name, async (event, input) => {
      return handler._handler({ context: { sender: event.sender }, input });
    });
  }
}

export function createRendererCaller<TRendererHandlers extends RendererHandlers>(
  webContents: WebContents
): GetRendererCaller<TRendererHandlers> {
  return new Proxy({}, {
    get(_target, prop: string) {
      return {
        send: (input: unknown) => webContents.send(prop, input),
        invoke: (input: unknown) => webContents.invoke(prop, input),
      };
    },
  }) as GetRendererCaller<TRendererHandlers>;
}
```

**renderer.ts** (~40 lines):
```typescript
export function createMainCaller<TMainHandlers extends MainHandlers>(
  options: { ipcInvoke: (channel: string, input: unknown) => Promise<any> }
): CreateMainCaller<TMainHandlers> {
  return new Proxy({}, {
    get(_target, prop: string) {
      return async (input: unknown) => {
        return options.ipcInvoke(prop, input);
      };
    },
  }) as CreateMainCaller<TMainHandlers>;
}

export function createRendererHandler<TRendererHandlers extends RendererHandlers>(
  options: { on: (channel: string, callback: any) => () => void; send: (channel: string, input: any) => void }
): CreateRendererHandlerInstance<TRendererHandlers> {
  return new Proxy({}, {
    get(_target, prop: string) {
      return {
        listen: (callback: any) => {
          return options.on(prop, (_event: any, ...args: any[]) => callback(...args));
        },
        handle: (callback: any) => {
          return options.on(prop, (_event: any, ...args: any[]) => callback(...args));
        },
      };
    },
  }) as CreateRendererHandlerInstance<TRendererHandlers>;
}
```

### Layer 2: IPC Definition (`src/main/ipc/index.ts`)

Single source of truth for all IPC interfaces.

```typescript
import { createMainHandler } from '../../shared/lib/tipc/main';
import { createNeovateServer } from '../server/create';
import { ErrorCodes } from '../server/constants';

export const mainHandlers = {
  'neovate-server:create': createMainHandler(async ({ context }) => {
    const instance = await createNeovateServer();
    return { url: instance.url };
  }),
} as const;

export type RendererHandlers = {
  demo: {
    helloFromMain: (message: string) => void;
  };
  math: {
    calculate: (left: number, right: number) => number;
  };
};
```

### Layer 3: Main Integration (`src/main/main.ts`)

Register handlers and optionally call renderer.

```typescript
import { registerMainHandlers, createRendererCaller } from '../shared/lib/tipc/main';
import { mainHandlers, type RendererHandlers } from './ipc';

// Register MainHandlers for renderer to invoke
registerMainHandlers(mainHandlers);

// Call renderer handlers (when needed)
const rendererCaller = getRendererCaller<RendererHandlers>(mainWindow.webContents);
rendererCaller.demo.helloFromMain.send("Hello from main!");
const sum = await rendererCaller.math.calculate.invoke(5, 10);
```

### Layer 4: Renderer Integration (`src/renderer/tipc/`)

Export instances for use throughout renderer.

**caller.ts** (~5 lines):
```typescript
import { createMainCaller } from '../../shared/lib/tipc/renderer';
import { mainHandlers } from '../../../main/ipc';

export const mainCaller = createMainCaller<typeof mainHandlers>({
  ipcInvoke: window.electron.ipcRenderer.invoke,
});
```

**handler.ts** (~10 lines):
```typescript
import { createRendererHandler } from '../../shared/lib/tipc/renderer';
import type { RendererHandlers } from '../../../main/ipc';

export const rendererHandler = createRendererHandler<RendererHandlers>({
  on: (channel, callback) => {
    window.electron.ipcRenderer.on(channel, callback);
    return () => window.electron.ipcRenderer.off(channel, callback);
  },
  send: window.electron.ipcRenderer.send,
});
```

## API Reference

### Main Process

**`createMainHandler<TInput>(fn)`**
Defines a main handler that renderer can invoke.
```typescript
createMainHandler(async ({ context, input }) => {
  // context: MainHandlerContext (includes sender)
  // input: TInput (inferred from type parameter or void)
  return output; // output: TOutput (inferred from return)
})
```

**`registerMainHandlers(mainHandlers)`**
Registers all MainHandlers with Electron's IPC system.

**`getRendererCaller<RendererHandlers>(webContents)`**
Creates typed interface to call renderer from main process.
```typescript
rendererCaller.namespace.method.send(input)    // fire and forget
await rendererCaller.namespace.method.invoke(input)  // request/response
```

### Renderer Process

**`createMainCaller()`**
Creates typed interface to invoke MainHandlers.
```typescript
await mainCaller['method-name'](input)  // input required if not void
await mainCaller['method-name']()       // void input
```

**`createRendererHandler()`**
Creates typed interface to handle events from main.
```typescript
const unlisten = rendererHandler.namespace.method.listen(callback);  // for .send()
const unlisten = rendererHandler.namespace.method.handle(callback);  // for .invoke()
```

## Type System

The type system provides automatic inference from function signatures:

**MainHandlers:**
```typescript
'neovate-server:create': createMainHandler<void, { url: string }>(async ({ context, input }) => {
  // input: void
  // return: { url: string }
})

'select-directory': createMainHandler<{ path: string }, string | null>(async ({ context, input }) => {
  // input: { path: string }
  // return: string | null
})
```

Type inference works by:
1. `createMainHandler<TInput>()` captures input type via generic
2. Function return type is captured automatically
3. `as const` preserves exact types for the handler object
4. Caller types are derived using `InferMainHandlerInput/Output`

**RendererHandlers:**
```typescript
export type RendererHandlers = {
  demo: {
    helloFromMain: (message: string) => void;           // .send() only
  };
  math: {
    calculate: (a: number, b: number) => number;        // .invoke() returns number
  };
  data: {
    fetch: (url: string) => Promise<Data>;              // .invoke() returns Promise
  };
};
```

## Data Flow

### Renderer → Main (Invoke MainHandlers)

1. Renderer calls: `await mainCaller['neovate-server:create']()`
2. `createMainCaller` Proxy intercepts the key access
3. Invokes `ipcInvoke('neovate-server:create', undefined)` via `@electron-toolkit/preload`
4. Main process `registerMainHandlers()` receives via `ipcMain.handle()`
5. Handler executes: `handler._handler({ context: { sender }, input: undefined })`
6. Result returns through IPC chain back to renderer as Promise

### Main → Renderer (Send Event)

1. Main calls: `rendererCaller.demo.helloFromMain.send('message')`
2. `getRendererCaller` Proxy intercepts, calls `webContents.send('send:demo.helloFromMain', 'message')`
3. Renderer `createRendererHandler` registered `.listen()` callback via `ipcRenderer.on()`
4. Callback executes with received message

### Main → Renderer (Invoke with Response)

1. Main calls: `await rendererCaller.math.calculate.invoke(5, 10)`
2. Uses `webContents.send('invoke:math.calculate', id, 5, 10)` with correlation ID
3. Renderer `.handle()` callback executes with `(5, 10)` arguments
4. Result flows back to main process via `send(id, { result })` as Promise

## Error Handling

- Errors thrown in MainHandlers propagate through IPC to renderer as rejected Promise
- Errors thrown in RendererHandlers `.handle()` propagate to main as rejected Promise
- Errors in `.send()` callbacks (fire-and-forget) are logged but not propagated
- Error type information is preserved through the type system

## Usage Examples

### Define and Register MainHandlers

```typescript
// src/main/ipc/index.ts
export const mainHandlers = {
  server: {
    create: createMainHandler(async ({ context }) => {
      const instance = await createNeovateServer();
      return { url: instance.url };
    }),
  },
  file: {
    save: createMainHandler<{ path: string }>(async ({ context, input }) => {
      await fs.writeFile(input.path, data);
      return { success: true };
    }),
  },
} as const;

// src/main/main.ts
registerMainHandlers(mainHandlers);
```

### Call MainHandlers from Renderer

```typescript
// src/renderer/hooks/useStoreConnection.ts
import { mainCaller } from '../tipc/caller';

const result = await mainCaller.server.create();
console.log(result.url);

// With input
await mainCaller.file.save({ path: '/tmp/file.txt' });
```

### Call RendererHandlers from Main

```typescript
// src/main/some-file.ts
import { getRendererCaller } from '../shared/lib/tipc/main';
import type { RendererHandlers } from './ipc';

const rendererCaller = getRendererCaller<RendererHandlers>(mainWindow.webContents);

// Send event
rendererCaller.demo.helloFromMain.send("Hello!");

// Invoke and await response
const sum = await rendererCaller.math.calculate.invoke(5, 10);
```

### Handle Events from Main in Renderer

```typescript
// src/renderer/Component.tsx
import { rendererHandler } from '../tipc/handler';

useEffect(() => {
  const unlisten = rendererHandler.demo.helloFromMain.listen((message) => {
    console.log(message);
  });
  return unlisten;
}, []);

useEffect(() => {
  const unlisten = rendererHandler.math.calculate.handle((a, b) => {
    return a + b;
  });
  return unlisten;
}, []);
```

## File Structure

### New Files (8 files)

**Library:**
- `src/shared/lib/tipc/types.ts` - Type definitions (~60 lines)
- `src/shared/lib/tipc/main.ts` - Main process helpers (~15 lines)
- `src/shared/lib/tipc/renderer.ts` - Renderer process helpers (~40 lines)
- `src/shared/lib/tipc/index.ts` - Barrel export (~5 lines)

**IPC Definition:**
- `src/main/ipc/index.ts` - MainHandlers and RendererHandlers (~20 lines)

**Renderer Instances:**
- `src/renderer/tipc/caller.ts` - mainCaller instance (~5 lines)
- `src/renderer/tipc/handler.ts` - rendererHandler instance (~10 lines)

**Types:**
- `src/renderer/types/electron.d.ts` - Window type augmentation (~8 lines)

### Modified Files (4 files)

- `src/main/main.ts` - Register MainHandlers, remove old `ipcMain.handle` (~5 lines)
- `src/main/preload.ts` - Add `@electron-toolkit/preload` (~2 lines)
- `src/renderer/hooks/useStoreConnection.ts` - Use mainCaller (~2 lines)
- `package.json` - Add `@electron-toolkit/preload` dependency (~1 line)

## Implementation Steps

1. Install `@electron-toolkit/preload` dependency
2. Create shared tipc library (`src/shared/lib/tipc/`)
3. Define IPC interfaces (`src/main/ipc/index.ts`)
4. Update main process to register handlers (`src/main/main.ts`)
5. Update preload script (`src/main/preload.ts`)
6. Create renderer instances (`src/renderer/tipc/caller.ts`, `handler.ts`)
7. Update renderer to use mainCaller (`src/renderer/hooks/useStoreConnection.ts`)
8. Run typecheck to verify: `npm run typecheck`
9. Run dev server: `npm run dev`
10. Manual test server connection creation

## Migration Path

After successful POC with `server.create`, migrate other IPC methods:

**Step 1: Add to MainHandlers**
```typescript
export const mainHandlers = {
  server: {
    create: createMainHandler(async ({ context }) => { /* ... */ }),
  },

  // Migrated methods
  dialog: {
    selectDirectory: createMainHandler(async ({ context }) => {
      return dialog.showOpenDialog(context.sender, { properties: ['openDirectory'] });
    }),
  },
  store: {
    save: createMainHandler<{ state: any }>(async ({ context, input }) => {
      await fs.writeFile(STORE_FILE, JSON.stringify(input.state));
      return { success: true };
    }),
  },
} as const;
```

**Step 2: Update Renderer Usage**
```typescript
// Old: await window.electron!.selectDirectory()
// New: await mainCaller.dialog.selectDirectory()

// Old: await window.electron!.saveStore(state)
// New: await mainCaller.store.save({ state })
```

**Step 3: Remove Old Handlers**
Once all calls migrated, remove old `ipcMain.handle()` calls and preload exposures.

## Trade-offs

### Pros
- **End-to-end type safety** - From main process → preload → renderer
- **Automatic type inference** - No manual type definitions needed
- **IDE autocomplete** - Full IntelliSense with return type inference
- **Single source of truth** - Router defines all procedures in one place
- **Refactoring safety** - Rename procedures, types update everywhere
- **Zero runtime overhead** - Pure TypeScript, no serialization
- **Bidirectional support** - Both renderer→main and main→renderer
- **Simple API** - Builder-free, just functions
- **Minimal implementation** - ~120 lines of library code

### Cons
- **New pattern for team to learn**
- **Proxy-based approach may complicate debugging**
- **Need to migrate existing IPC methods gradually**
- **Requires TypeScript 5+ for full type inference**

### Alternatives Considered
- **Use `@egoist/tipc` directly** - Too heavyweight, includes React Query
- **Manual type definitions** - No autocomplete, easy to drift
- **Keep current approach** - No type safety
- **Procedure builder chain** - More complex, unnecessary for this use case

## Benefits

1. **Type Safety** - Compile-time errors for wrong procedure names or types
2. **Developer Experience** - Autocomplete for all IPC methods
3. **Maintainability** - All IPC contracts in one place
4. **Scalability** - Easy to add new procedures
5. **Refactoring** - Rename safely with IDE support
6. **Documentation** - Types serve as inline documentation

## Success Criteria

1. ✅ tipc library compiles without errors
2. ✅ MainHandlers exports correct types
3. ✅ `mainCaller['neovate-server:create']()` has proper autocomplete
4. ✅ IDE shows return type as `Promise<{ url: string }>`
5. ✅ App boots and connects to server successfully
6. ✅ Error handling works identically to before
7. ✅ No breaking changes to existing code
8. ✅ Bidirectional communication works (main→renderer)
