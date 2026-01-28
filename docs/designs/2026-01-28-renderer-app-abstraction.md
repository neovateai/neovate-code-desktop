# RendererApp Abstraction

**Date:** 2026-01-28

## Context

Following the successful abstraction of the main process into a `MainApp` class (see `docs/plans/2026-01-28-refactor-mainapp-wrapper-plan.md`), we need a similar abstraction for the renderer process. This enables another Electron app to import the renderer as a git submodule and customize it through plugins while maintaining type safety.

### Goals
- **Reuse in another app** - Import renderer as git submodule
- **Testing & maintainability** - Better separation for unit testing
- **Customization hooks** - Allow plugins to modify UI, add features, extend state
- **Multi-window support** - Different windows render different content
- **Type safety** - Users extend base types for their own plugin definitions

## Discussion

### Electron Process Model

Each BrowserWindow runs in a separate renderer process with completely isolated memory:

```
Main Process (Node.js)
    │
    ├── BrowserWindow 1 (Main) → Renderer Process 1
    │                            └── Store, Plugins, Persistence
    │
    ├── BrowserWindow 2 (Sub)  → Renderer Process 2
    │                            └── Component only (no plugins)
    │
    └── BrowserWindow 3 (Sub)  → Renderer Process 3
                                 └── Component only (no plugins)
```

Key implications:
- **Plugins only run on main window** - Sub-windows render matched component directly without plugin lifecycle, store hydration, or persistence
- Memory is NOT shared between windows
- Code sharing is compile-time only (import shared components)
- Cross-window communication must go through main process

### Store Architecture Decision

**Decision: Keep store as singleton per process**

Rationale:
- No refactoring of existing store code needed
- No changes to component imports
- Plugins access store via direct import
- Each window naturally has its own store instance due to process isolation

### API Design Decisions

**Single object input with optional `windows` array:**
- RendererApp always takes an object
- `plugins` configured at app level, **only run on main window**
- `windows` is an optional array for **sub-window routing only**
- Sub-windows render their component directly without plugin lifecycle, store hydration, or persistence

**Window matching with fallback:**
- `windows` config is for **sub-windows only** (e.g., settings, quick actions)
- No `windowId` param in URL → main window, uses default App component with full plugin lifecycle
- With `?windowId=xxx` → sub-window, renders matched component directly (no plugins)

**Type system approach:**
- Library provides base types (`BasePlugin`, `WindowConfig`, `RendererAppOptions`)
- Users extend `BasePlugin` for their specific plugin hooks
- TypeScript generics provide type inference

### Cross-Window Communication

**Decision: Separate module (not in RendererApp)**

Cross-window communication will be handled by a dedicated module in Phase 2, keeping RendererApp focused on bootstrap responsibilities.

## Approach

Create a `RendererApp` class that:
1. Handles bootstrap orchestration (hydration, rendering, persistence)
2. Manages a plugin system with lifecycle hooks at the app level
3. Supports multi-window routing via optional `windows` config
4. Provides extensible types for consumer customization

## Architecture

### Type System

```typescript
// Library provides base types
export interface BasePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  init?: (opts: { store: typeof useStore }) => Promise<void> | void;
  ready?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface WindowConfig {
  windowId: string;
  parent?: string;
  componentLoader: () => Promise<{ default: React.ComponentType }>;
}

export interface RendererAppOptions<P extends BasePlugin = BasePlugin> {
  plugins?: P[];
  windows?: WindowConfig[];
}

// Users extend BasePlugin for type safety
interface MyPlugin extends BasePlugin {
  activityBarItems?: () => ActivityBarItem[];
  sidebarTabs?: () => SidebarTab[];
}

// Usage - plugins run on main window only, windows config for sub-windows
new RendererApp<MyPlugin>({
  plugins: [
    { name: 'branding', activityBarItems: () => [...] },
  ],
  windows: [
    // Sub-windows only - matched by ?windowId=xxx query param
    { windowId: 'settings', parent: 'main', componentLoader: () => import('./SettingsWindow') },
  ],
});
```

### RendererApp Class

```typescript
export class RendererApp<P extends BasePlugin = BasePlugin> {
  private options: RendererAppOptions<P>;

  constructor(options?: RendererAppOptions<P>) {
    this.options = options ?? {};
  }

  async start(): Promise<void> {
    const windowConfig = this.matchWindowBySearchParams();

    // Sub window: render matched component directly (no plugins)
    if (windowConfig) {
      this.render(React.lazy(windowConfig.componentLoader));
      return;
    }

    // Main window: full lifecycle with plugins
    // 1. Hydrate store from persistence
    // 2. Run plugin hooks (Series)
    // 3. Render default App (lazy loaded)
    // 4. Setup persistence
  }

  // windows config is for sub-windows only
  private matchWindowBySearchParams(): WindowConfig | undefined {
    if (!this.windows.length) return undefined;
    const windowId = new URLSearchParams(location.search).get('windowId');
    if (!windowId) return undefined;  // Main window → use default App
    return this.windows.find(w => w.windowId === windowId);
  }
}
```

### Plugin Manager

The PluginManager uses TypeScript's type inference to provide full type safety for hook execution. Instead of string-based hook names with manual type casting, the manager infers context, arguments, and return types directly from the hooks interface.

**Type Helpers:**

```typescript
// Plugin = name + enforce + partial hooks implementation
type DefinePlugin<H> = {
  name: string;
  enforce?: 'pre' | 'post';
} & Partial<H>;

// Extract `this` context type from hook function
type HookContext<H, K extends keyof H> = H[K] extends (
  this: infer C,
  ...args: never[]
) => unknown
  ? C
  : unknown;

// Extract argument types from hook function (excluding `this`)
type HookArgs<H, K extends keyof H> = H[K] extends (
  this: unknown,
  ...args: infer A
) => unknown
  ? A
  : never;

// Extract return type from hook function (awaited)
type HookReturn<H, K extends keyof H> = H[K] extends (
  ...args: never[]
) => infer R
  ? Awaited<R>
  : never;
```

**Type-Safe Apply Methods:**

```typescript
class PluginManager<H extends object> {
  // All methods infer types from the hooks interface H

  async applySeries<K extends keyof H>(
    hook: K,                      // Only valid hook names allowed
    context: HookContext<H, K>,   // Context type inferred from hook's `this`
    ...args: HookArgs<H, K>       // Args inferred from hook signature
  ): Promise<void>;

  async applyFirst<K extends keyof H>(
    hook: K,
    context: HookContext<H, K>,
    ...args: HookArgs<H, K>
  ): Promise<HookReturn<H, K> | undefined>;  // Return type inferred

  async applyParallel<K extends keyof H>(...): Promise<HookReturn<H, K>[]>;
  async applySeriesLast<K extends keyof H>(...): Promise<HookReturn<H, K>>;
  async applySeriesMerge<K extends keyof H>(...): Promise<HookReturn<H, K>>;
}
```

**Usage Example:**

```typescript
// Define hooks interface with typed signatures
interface RendererPluginHooks {
  beforeRender(
    this: PluginContext,  // `this` becomes the context type
    options: { store: typeof useStore },
  ): void | Promise<void>;
}

// TypeScript enforces correct usage:
pluginManager.applySeries(
  "beforeRender",           // ✓ Only "beforeRender" allowed
  { app: this },            // ✓ Must match PluginContext
  { store: useStore },      // ✓ Must match options type
);

pluginManager.applySeries(
  "invalidHook",            // ✗ Type error: not in RendererPluginHooks
  { app: this },
  { store: useStore },
);
```

This approach eliminates runtime errors from typos in hook names or incorrect argument types - all caught at compile time.

### Lazy Loading

```typescript
new RendererApp({
  plugins: [brandingPlugin, analyticsPlugin],  // Only runs on main window
  windows: [
    // Sub-windows with lazy-loaded components
    { windowId: 'settings', componentLoader: () => import('./windows/SettingsWindow') },
  ],
});

// Results in code-split bundles:
// ├── main.js                    (shared + entry)
// ├── App.chunk.js               (main window, lazy)
// └── SettingsWindow.chunk.js    (settings sub-window, lazy)
```

## Usage Examples

### Single Window (Simple)

```typescript
const app = new RendererApp({
  plugins: [brandingPlugin, analyticsPlugin],
});
app.start(document.getElementById('root')!);
```

### Multi-Window

```typescript
// Main window uses default App with plugins
// Sub-windows are configured via `windows` array
const app = new RendererApp({
  plugins: [brandingPlugin],  // Only runs on main window
  windows: [
    // Sub-windows only - matched by ?windowId=xxx
    { windowId: 'settings', componentLoader: () => import('./SettingsWindow') },
    { windowId: 'quick', componentLoader: () => import('./QuickAction') },
  ],
});
app.start();
```

## Implementation Phases

### Phase 1: Core Structure
- `BasePlugin`, `WindowConfig`, `RendererAppOptions<P>` types
- `RendererApp<P>` class with start/unmount
- `RendererPluginManager<P>`
- Plugin context provider
- Simplify `main.tsx` to use RendererApp
- Plugin lifecycle hooks: `init`, `ready`, `destroy`
- Multi-window routing via `windows` option
- Lazy loading via render function

### Phase 2: Cross-Window Communication (Separate Module)
- Window communication module
- State sync across windows
- Event broadcast/targeted send
- Window relationships (parent/child)

### Phase 3: UI Extensions
- UI slots: `activityBarItems`, `sidebarTabs`, `settingsPages`
- Theme/feature modification hooks
- Isolated plugin store system
- State change subscriptions

## Files Changed (Phase 1)

| File | Change |
|------|--------|
| `src/renderer/types.ts` | **New** - BasePlugin, WindowConfig, RendererAppOptions types |
| `src/renderer/app.ts` | **New** - RendererApp class |
| `src/renderer/main.tsx` | Simplify to use RendererApp |
| `src/renderer/plugins/manager.ts` | **New** - PluginManager |
| `src/renderer/plugins/context.ts` | **New** - PluginContext |

**No changes to:**
- `src/renderer/store/index.ts` - stays as singleton
- `src/renderer/components/*.tsx` - no import changes
- `src/renderer/App.tsx` - stays as-is
