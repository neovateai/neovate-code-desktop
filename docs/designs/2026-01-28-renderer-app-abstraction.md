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
    ├── BrowserWindow 1 → Renderer Process 1 (isolated)
    │                     └── Store instance 1, Plugins
    │
    ├── BrowserWindow 2 → Renderer Process 2 (isolated)
    │                     └── Store instance 2, Plugins
    │
    └── BrowserWindow 3 → Renderer Process 3 (isolated)
                          └── Store instance 3, Plugins
```

Key implications:
- Each process has its own store instance and plugins
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
- `plugins` configured at app level (shared across all windows in that process)
- `windows` is an optional array for multi-window routing
- Windows only define `windowId`, `render`, and `parent` - no per-window plugins

**Window matching:**
- No `windowId` param in URL → default to first window (main)
- With `?windowId=xxx` → match specific window config

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
  render?: () => Promise<{ default: React.ComponentType }>;
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

// Usage
new RendererApp<MyPlugin>({
  plugins: [
    { name: 'branding', activityBarItems: () => [...] },
  ],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', parent: 'main', render: () => import('./SettingsWindow') },
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

  async start(container: HTMLElement): Promise<void> {
    // Match window: default first (main), with ?windowId=xxx match specific
    const windowId = new URLSearchParams(location.search).get('windowId');
    const windowConfig = windowId
      ? this.options.windows?.find(w => w.windowId === windowId)
      : this.options.windows?.[0];

    // 1. Create plugin manager (sorted by enforce)
    // 2. Run plugin 'init' hooks (Series)
    // 3. Hydrate store from persistence
    // 4. Get content
    const Content = windowConfig?.render ? React.lazy(windowConfig.render) : App;
    // 5. Render with PluginContext + ToastProvider + Suspense
    // 6. Setup persistence
    // 7. Run plugin 'ready' hooks (Parallel)
  }

  unmount(): void {
    // 1. Run plugin 'destroy' hooks (Series)
    // 2. Unmount React root
  }
}
```

### Plugin Manager

```typescript
export class RendererPluginManager<P extends BasePlugin = BasePlugin> {
  #plugins: P[] = [];

  constructor(rawPlugins: P[]) {
    // Sort by enforce: pre -> normal -> post
    this.#plugins = [
      ...rawPlugins.filter((p) => p.enforce === 'pre'),
      ...rawPlugins.filter((p) => !p.enforce),
      ...rawPlugins.filter((p) => p.enforce === 'post'),
    ];
  }

  async apply({ hook, args, memo, type, pluginContext }): Promise<any> {
    // Hook execution types: First, Parallel, Series, SeriesLast, SeriesMerge
  }
}
```

### Lazy Loading

```typescript
new RendererApp({
  plugins: [brandingPlugin, analyticsPlugin],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', render: () => import('./windows/SettingsWindow') },
  ],
});

// Results in code-split bundles:
// ├── main.js                    (shared + entry)
// ├── App.chunk.js               (main window, lazy)
// └── SettingsWindow.chunk.js    (settings window, lazy)
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
const app = new RendererApp({
  plugins: [brandingPlugin],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', render: () => import('./SettingsWindow') },
    { windowId: 'quick', render: () => import('./QuickAction') },
  ],
});
app.start(document.getElementById('root')!);
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
