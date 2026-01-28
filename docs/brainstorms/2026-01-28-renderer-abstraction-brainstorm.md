# Renderer Abstraction Brainstorm

**Date:** 2026-01-28
**Status:** Ready for Planning
**Related:** `docs/plans/2026-01-28-refactor-mainapp-wrapper-plan.md`
**Design:** `docs/designs/2026-01-28-renderer-app-abstraction.md`

## What We're Building

Abstract the renderer process into a reusable `RendererApp` class with a plugin system, mirroring the MainApp pattern established for the main process. This enables another Electron app to import the renderer as a submodule and customize it through plugins.

### Goals
- **Reuse in another app** - Import renderer as git submodule
- **Testing & maintainability** - Better separation for unit testing
- **Customization hooks** - Allow plugins to modify UI, add features, extend state
- **Multi-window support** - Different windows can render different content
- **Type safety** - Users extend base types for their own plugin definitions

### Customization Capabilities
- Theming & branding (colors, logos, visual identity)
- Feature toggles (enable/disable onboarding, developer mode, panels)
- Additional components (inject custom panels, sidebars, UI elements)
- Store extensions (add custom Zustand slices, extend state)
- Custom window content (render any component in any window)
- Lazy loading for different window types

## Electron Process Model (Important Context)

```
Main Process (Node.js)
    │
    ├── BrowserWindow 1 → Renderer Process 1 (独立进程)
    │                     └── Store instance 1, Plugins
    │
    ├── BrowserWindow 2 → Renderer Process 2 (独立进程)
    │                     └── Store instance 2, Plugins
    │
    └── BrowserWindow 3 → Renderer Process 3 (独立进程)
                          └── Store instance 3, Plugins
```

**Key points:**
- Each window = separate renderer process (completely isolated)
- Each process has its own store instance and plugins
- Memory is NOT shared between windows
- Code sharing = compile-time only (import shared components)
- Cross-window communication will be handled by a separate module (not RendererApp)

## Type System Design

### 库提供基础类型（可扩展）

```typescript
// src/renderer/types.ts

// 基础 Plugin - 只有通用生命周期
export interface BasePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  init?: (opts: { store: typeof useStore }) => Promise<void> | void;
  ready?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

// 窗口配置 - 只有路由信息，没有 plugins
export interface WindowConfig {
  windowId: string;
  parent?: string;
  render?: () => Promise<{ default: React.ComponentType }>;
}

// RendererApp 选项 - plugins 在 app 级别
export interface RendererAppOptions<P extends BasePlugin = BasePlugin> {
  plugins?: P[];
  windows?: WindowConfig[];
}
```

### 用户扩展类型（类型安全）

```typescript
// 用户定义自己的 Plugin 类型
interface MyPlugin extends BasePlugin {
  activityBarItems?: () => ActivityBarItem[];
  sidebarTabs?: () => SidebarTab[];
  theme?: (t: ThemeConfig) => ThemeConfig;
}

// 使用泛型确保类型安全
new RendererApp<MyPlugin>({
  plugins: [
    {
      name: 'branding',
      activityBarItems: () => [...],  // ✅ 类型安全
      sidebarTabs: () => [...],       // ✅ 类型安全
    }
  ],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', parent: 'main', render: () => import('./SettingsWindow') },
  ],
});
```

### 类型系统优势

| 方面 | 结果 |
|------|------|
| 库预定义窗口类型？ | ❌ 不需要 |
| 用户自由定义插件？ | ✅ 完全自由 |
| 类型安全？ | ✅ 通过 `extends BasePlugin` |
| 泛型推断？ | ✅ RendererApp<P> 自动推断 |

## RendererApp Design

### API: Object with Optional `windows`

```typescript
// Single window (no windows config)
new RendererApp({
  plugins: [brandingPlugin],
});

// Multi-window (with windows array)
new RendererApp({
  plugins: [brandingPlugin, analyticsPlugin],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', parent: 'main', render: () => import('./SettingsWindow') },
    { windowId: 'quick', render: () => import('./QuickAction') },
  ],
});
```

Plugins are configured at the app level, shared across the codebase. Windows only define routing (which component to render for which windowId).

**Window matching:**
- No `windowId` param in URL → default to first window (main)
- With `?windowId=settings` → match specific window config

### RendererApp Class

```typescript
// src/renderer/app.ts
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

### Store Architecture: Singleton per Process

The Zustand store **remains a singleton within each renderer process**:
- No refactoring of existing store code
- No changes to component imports
- Plugins access store via direct import
- Each window has its own store instance

### Lazy Loading Support

```typescript
// Lazy load components per window
new RendererApp({
  plugins: [brandingPlugin],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', render: () => import('./windows/SettingsWindow') },
    { windowId: 'quick', render: () => import('./windows/QuickAction') },
  ],
});

// In start()
const LazyComponent = React.lazy(windowConfig.render);
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

Bundle output:
```
├── main.js                    (公共代码 + 入口)
├── App.chunk.js               (主窗口，按需加载)
├── SettingsWindow.chunk.js    (设置窗口)
└── QuickAction.chunk.js       (快捷操作窗口)
```

## Plugin System

### Aligned with Backend Pattern

```typescript
// Enforce ordering: pre -> normal -> post
type Enforce = 'pre' | 'post';

// Hook execution types
enum PluginHookType {
  First = 'first',        // First non-null result wins
  Parallel = 'parallel',  // Run all in parallel
  Series = 'series',      // Run sequentially
  SeriesLast = 'last',    // Chain results
  SeriesMerge = 'merge',  // Merge/concat results
}
```

### Plugin Interface

```typescript
// src/renderer/plugins/types.ts

// 库提供的基础 Plugin
export interface BasePlugin {
  name: string;
  enforce?: 'pre' | 'post';

  // 生命周期（所有窗口通用）
  init?: (opts: { store: typeof useStore }) => Promise<void> | void;
  ready?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

// 用户扩展示例
interface MyAppPlugin extends BasePlugin {
  activityBarItems?: () => ActivityBarItem[];
  sidebarTabs?: () => SidebarTabDefinition[];
  settingsPages?: () => SettingsPageDefinition[];
  theme?: (theme: ThemeConfig) => ThemeConfig;
}
```

### Plugin Store: Isolated + Global Access (Phase 3)

Each plugin can have its own isolated store while accessing the global singleton:

```typescript
interface PluginStoreContext {
  local: StoreApi<PluginState>;           // Plugin's own store
  global: {
    getState: () => GlobalState;           // Read global state
    subscribe: (fn) => Unsubscribe;        // Watch global changes
  };
  actions: {
    selectSession: (id: string) => void;   // Controlled mutations
    showToast: (msg: string) => void;
  };
}
```

### Plugin Manager

```typescript
// src/renderer/plugins/manager.ts
export class RendererPluginManager<P extends BasePlugin = BasePlugin> {
  #plugins: P[] = [];

  constructor(rawPlugins: P[]) {
    this.#plugins = [
      ...rawPlugins.filter((p) => p.enforce === 'pre'),
      ...rawPlugins.filter((p) => !p.enforce),
      ...rawPlugins.filter((p) => p.enforce === 'post'),
    ];
  }

  async apply({ hook, args, memo, type, pluginContext }): Promise<any> {
    // Same implementation as backend PluginManager
  }
}
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RendererApp scope | Bootstrap only | Simple, focused responsibility |
| Options API | Object with optional `windows` | Clean, single input shape |
| Plugins location | App level only | Windows don't need separate plugins |
| Config matching | Default first (main), URL param for others | Simple, works with Main process |
| Type system | Generics + extends | 库不预设，用户扩展，类型安全 |
| Store | Singleton per process | No refactoring needed |
| Lazy loading | Via render function | Each window loads only what it needs |
| Plugin ordering | `enforce: 'pre' \| 'post'` | Aligned with backend |
| Hook types | Series/Parallel/First/Last/Merge | Same as backend |
| Cross-window communication | Separate module | Keep RendererApp focused |

## Implementation Phases

### Phase 1: Core Structure (This PR)
- [ ] `BasePlugin`, `WindowConfig`, `RendererAppOptions<P>` types in `src/renderer/types.ts`
- [ ] `RendererApp<P>` class in `src/renderer/app.ts`
- [ ] `RendererPluginManager<P>` in `src/renderer/plugins/manager.ts`
- [ ] Plugin context in `src/renderer/plugins/context.ts`
- [ ] Simplify `main.tsx` to use RendererApp
- [ ] Plugin lifecycle hooks: `init`, `ready`, `destroy`
- [ ] Multi-window routing via `windows` option
- [ ] Lazy loading via render function

### Phase 2: Cross-Window Communication (Separate Module)
- [ ] Window communication module design
- [ ] State sync across windows
- [ ] Event broadcast/targeted send
- [ ] Window relationships (parent/child)

### Phase 3: UI Extensions (Future PRs)
- [ ] UI slots: `activityBarItems`, `sidebarTabs`, `settingsPages`
- [ ] Theme/feature modification hooks
- [ ] Isolated plugin store system
- [ ] State change subscriptions
- [ ] Slash command extensions

## Files Changed

### Phase 1

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
- `src/renderer/hooks/*.ts` - no import changes
- `src/renderer/App.tsx` - stays as-is

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

## Example Plugins

```typescript
interface MyPlugin extends BasePlugin {
  activityBarItems?: () => ActivityBarItem[];
  sidebarTabs?: () => SidebarTab[];
  theme?: (theme: ThemeConfig) => ThemeConfig;
}

const brandingPlugin: MyPlugin = {
  name: 'branding',
  enforce: 'pre',

  init({ store }) {
    console.log('Current repo:', store.getState().selectedRepoPath);
  },

  activityBarItems() {
    return [{ id: 'brand-logo', component: BrandLogo, priority: 0 }];
  },

  sidebarTabs() {
    return [{ id: 'custom', label: 'Custom', component: CustomTab }];
  },

  theme(config) {
    return { ...config, primaryColor: '#brand' };
  }
};
```

## Value Summary

| Capability | Phase 1 | Phase 2 | Phase 3 |
|------------|---------|---------|---------|
| Bootstrap orchestration | ✅ | ✅ | ✅ |
| Plugin system (app level) | ✅ | ✅ | ✅ |
| Type-safe plugin definitions | ✅ | ✅ | ✅ |
| Custom render content | ✅ | ✅ | ✅ |
| Lazy loading support | ✅ | ✅ | ✅ |
| Multi-window routing | ✅ | ✅ | ✅ |
| Cross-window communication | ❌ | ✅ | ✅ |
| UI slots (activity bar, etc.) | ❌ | ❌ | ✅ |
| Theme/feature hooks | ❌ | ❌ | ✅ |
| Plugin isolated stores | ❌ | ❌ | ✅ |

## Next Steps

Run `/workflows:plan` to create detailed implementation plan for Phase 1.
