---
title: "feat: Plugin Titlebar Contributions + BrowserWindowManager"
type: feat
date: 2026-02-06
---

# feat: Plugin Titlebar Contributions + BrowserWindowManager

## Overview

Extend the plugin contribution system to support titlebar items, and add a BrowserWindowManager to the main process for opening sub-windows. Also fix the contribution merging strategy to properly concatenate arrays from multiple plugins.

**Brainstorm:** `docs/brainstorms/2026-02-06-plugin-titlebar-and-window-manager-brainstorm.md`
**Design:** `docs/designs/2026-02-06-plugin-titlebar-window-manager.md`

## Acceptance Criteria

- [x] Plugins can contribute arbitrary React components to PrimaryTitleBar and SecondaryTitleBar via `configContributes()`
- [x] BrowserWindowManager in main process supports `open` and `close` via typesafe IPC
- [x] `window.open` creates a new BrowserWindow with `?windowId=xxx&windowType=yyy` or focuses existing one
- [x] `windowType` determines which component to render, `windowId` is the instance dedup key
- [x] `window.open` supports optional `parent` flag to attach sub-window to main window
- [x] Contribution merging uses `applyParallelArray` (replaces `applySeriesMerge` + `defu`)
- [x] macOS `activate` handler checks `this.mainWindow === null` instead of `getAllWindows().length`
- [x] Demo plugin verifies both features work end-to-end
- [x] `npm run typecheck` passes

## MVP

### Phase 1: Contribution types + merging fix

#### `src/renderer/core/plugin/contributions.ts` — Add titlebar types

```ts
export interface TitlebarItemProps {
  app: RendererApp;
}

export interface TitlebarItemDescriptor {
  /** Unique identifier */
  id: string;
  /** Lazy component loader */
  componentLoader: () => Promise<{ default: ComponentType<TitlebarItemProps> }>;
}
```

Add two separate fields to `PluginConfigContribution`:
```ts
export interface PluginConfigContribution {
  activityBarItems?: ActivityBarItemDescriptor[];
  secondarySidebarPanels?: SecondarySidebarPanelDescriptor[];
  contentPanels?: ContentPanelDescriptor[];
  primaryTitlebarItems?: TitlebarItemDescriptor[];    // NEW
  secondaryTitlebarItems?: TitlebarItemDescriptor[];   // NEW
}
```

No `position` field — the array name determines placement.

#### `src/renderer/core/plugin/index.ts` — Re-export new types

Add `TitlebarItemDescriptor`, `TitlebarItemProps` to exports.

#### `src/renderer/core/plugin-manager.ts` — Add `applyParallelArray`

New method that runs hooks in parallel and concatenates array fields (replaces `applySeriesMerge` + `defu` for array-valued contributions):

```ts
async applyParallelArray<K extends keyof H>(
  hook: K,
  context: HookContext<H, K>,
  ...args: HookArgs<H, K>
): Promise<HookReturn<H, K>> {
  const results = await this.applyParallel(hook, context, ...args);
  const merged = {} as Record<string, unknown[]>;
  for (const r of results) {
    if (!r) continue;
    for (const [key, value] of Object.entries(r as Record<string, unknown>)) {
      if (!merged[key]) merged[key] = [];
      if (Array.isArray(value)) merged[key].push(...value);
    }
  }
  return merged as HookReturn<H, K>;
}
```

#### `src/renderer/core/app.tsx` — Fix contribution merging

Replace `applySeriesMerge` with `applyParallelArray`:

```ts
this.contributions = await this.pluginManager.applyParallelArray(
  'configContributes',
  { app: this },
);
```

### Phase 2: Render plugin titlebar items

#### `src/renderer/components/layout/PrimaryTitleBar.tsx`

- Get `contributions.primaryTitlebarItems` via `useRendererApp()`
- Render in plugin registration order after existing content (repo selector / SessionInfoBar)
- Each item wrapped in ErrorBoundary + Suspense for fault isolation:
  ```tsx
  <ErrorBoundary fallback={null} onError={(error) => console.error(`[Plugin] ${item.id} failed:`, error)}>
    <Suspense fallback={null}>
      <LazyComponent app={app} />
    </Suspense>
  </ErrorBoundary>
  ```
- Already inside `WebkitAppRegion: 'no-drag'`

DOM layout:
```
[SessionInfoBar or RepoSelector] [plugin-item-1] [plugin-item-2] ...
```

#### `src/renderer/components/layout/SecondaryTitleBar.tsx`

- Get `contributions.secondaryTitlebarItems` via `useRendererApp()`
- Render in plugin registration order **before** existing buttons (OpenAppButton, Settings)
- Each item wrapped in `<ErrorBoundary fallback={null} onError={...}><Suspense fallback={null}>...</Suspense></ErrorBoundary>` (same pattern as PrimaryTitleBar)
- Inside the existing `no-drag` div

DOM layout:
```
[drag spacer] [plugin-item-1] [plugin-item-2] [OpenAppButton] [Settings]
```

### Phase 3: BrowserWindowManager

#### `src/main/browser-window-manager.ts` — New file

```ts
// WindowOpenOptions lives here — renderer gets the type automatically via IPC type inference chain
// (exposeAsMainHandlers → MainHandlersOf → IPCMainHandlers → CreateMainCaller → ipcMainCaller)
export interface WindowOpenOptions {
  windowId: string;      // unique instance key, dedup key in Map
  windowType: string;    // matches WindowConfig.windowType, determines which component to render
  width?: number;        // default 800
  height?: number;       // default 600
  title?: string;        // default windowId
  parent?: boolean;      // default false; true = attach to mainWindow
}

class BrowserWindowManager {
  private windows = new Map<string, BrowserWindow>();
  private mainWindow: BrowserWindow | null = null;

  /** Call after main window is created, null on main window close */
  setMainWindow(win: BrowserWindow | null): void {
    this.mainWindow = win;
  }

  mainHandlers = exposeAsMainHandlers(this, ['open', 'close']);

  open({ input }: { input: WindowOpenOptions }): void {
    const { windowId, windowType, width = 800, height = 600, title, parent = false } = input;

    // Deduplicate: focus existing window
    const existing = this.windows.get(windowId);
    if (existing) {
      if (!existing.isDestroyed()) {
        existing.focus();
        return;
      }
      // Stale entry cleanup — window destroyed without 'closed' event (e.g. win.destroy())
      this.windows.delete(windowId);
    }

    const win = new BrowserWindow({
      width,
      height,
      title: title ?? windowId,
      // If parent=true, attach to main window (follows main window, closes with it)
      ...(parent && this.mainWindow ? { parent: this.mainWindow } : {}),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Load renderer with windowId + windowType query params
    const params = new URLSearchParams({ windowId, windowType });
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      const url = new URL(process.env.ELECTRON_RENDERER_URL);
      url.search = params.toString();
      win.loadURL(url.toString());
    } else {
      win.loadFile(
        path.join(__dirname, '../renderer/index.html'),
        { search: params.toString() },
      );
    }

    win.on('closed', () => {
      this.windows.delete(windowId);
    });

    // Clean up if page fails to load (wrong preload path, network error in dev, etc.)
    win.webContents.on('did-fail-load', () => {
      this.windows.delete(windowId);
      if (!win.isDestroyed()) win.close();
    });

    this.windows.set(windowId, win);
  }

  close({ input }: { input: { windowId: string } }): void {
    const win = this.windows.get(input.windowId);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }

  destroyAll(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) {
        win.destroy(); // bypass beforeunload for deterministic cleanup
      }
    }
    this.windows.clear();
  }
}

export const browserWindowManager = new BrowserWindowManager();
```

**Design decisions:**
- **Singleton pattern**: Consistent with `updaterService`, `ptyManager`, and other main process services. Not mounted on `MainApp` instance.
- `parent` option: `false` by default (independent window). When `true`, sets `parent: mainWindow` so the sub-window follows the main window, stays on top of it, and closes with it on macOS.
- `setMainWindow()` called from `MainApp.createWindow()` after BrowserWindow is created. This is the bridge for future refactoring — when ready to unify all window management, move `createWindow()` logic into `BrowserWindowManager.createMainWindow()`.
- `windowType` is required, passed to renderer URL so `matchWindowBySearchParams()` can route to the correct component.
- V1 options: `windowId`, `windowType`, `width`, `height`, `title`, `parent`. More BrowserWindow options can be added later.

#### `src/main/ipc/index.ts` — Register window namespace

```ts
import { browserWindowManager } from '../browser-window-manager';

// Add to ipcMainHandlers:
window: browserWindowManager.mainHandlers,
```

#### `src/main/core/app.ts` — Integration

1. Call `browserWindowManager.setMainWindow(this.mainWindow)` after creating the main window in `createWindow()`.
2. Handle main window close — clear the reference so `activate` handler works correctly:

```ts
// In createWindow(), after creating mainWindow:
this.mainWindow.on('closed', () => {
  this.mainWindow = null;
  browserWindowManager.setMainWindow(null);
});
```

3. Add `browserWindowManager.destroyAll()` in `cleanup()` method.
4. Fix macOS `activate` handler:

```ts
// Before (broken with sub-windows)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    this.createWindow();
  }
});

// After (correct)
app.on('activate', () => {
  if (this.mainWindow === null) {
    this.createWindow();
  }
});
```

### Phase 4: RendererApp window namespace

#### `src/renderer/core/app.tsx` — Add `window` namespace

```ts
// Types flow automatically from BrowserWindowManager → IPC inference — no explicit import needed
readonly window = {
  open: ipcMainCaller.window.open,
  close: ipcMainCaller.window.close,
};
```

This is the plugin API surface for window operations. Internal components use `ipcMainCaller` directly (existing pattern); external plugins use `app.window.*`.

### Phase 5: Demo plugin

#### `src/renderer/core/types.ts` — Update WindowConfig

```ts
export interface WindowConfig {
  windowType: string;    // was windowId — identifies window type, not instance
  componentLoader: () => Promise<{ default: ComponentType }>;
}
```

#### `src/renderer/core/app.tsx` — Update matchWindowBySearchParams

```ts
private matchWindowBySearchParams(): WindowConfig | undefined {
  if (!this.windows.length) return undefined;
  const windowType = new URLSearchParams(location.search).get('windowType');
  if (!windowType) return undefined;
  return this.windows.find((w) => w.windowType === windowType);
}
```

#### `src/renderer/plugins/demo-dashboard/plugin.tsx`

Plugin exports both the plugin and its WindowConfig. Contributes a button to `secondaryTitlebarItems`. On click, calls `app.window.open({ windowId: 'demo-dashboard', windowType: 'demo-dashboard', width: 1000, height: 700, title: 'Dashboard' })`.

```ts
// Co-locate windowType string — single source of truth
export const demoDashboardWindowConfig: WindowConfig = {
  windowType: 'demo-dashboard',
  componentLoader: () => import('./DashboardWindow'),
};
```

#### `src/renderer/plugins/demo-dashboard/DashboardWindow.tsx`

Simple component rendered in the sub-window.

#### `src/renderer/main.tsx` — Register demo plugin + WindowConfig

```ts
import { demoDashboardPlugin, demoDashboardWindowConfig } from './plugins/demo-dashboard/plugin';

const rendererApp = new RendererApp({
  plugins: [demoDashboardPlugin],
  windows: [demoDashboardWindowConfig],
});
```

Note: WindowConfig is registered separately from the plugin (timing constraint — `matchWindowBySearchParams()` runs before `configContributes()`). But the config is co-located with the plugin to avoid magic string duplication.

### Phase 6: Tests

#### `src/main/browser-window-manager.test.ts`

Mock `BrowserWindow` from electron, test `BrowserWindowManager` logic:

- `open()` — creates new window with correct BrowserWindow options
- `open()` with same `windowId` — focuses existing window, does not create duplicate
- `open()` with same `windowType` but different `windowId` — creates separate windows
- `open()` with destroyed existing window — cleans up stale entry, creates new window
- `open()` with `parent: true` + `setMainWindow()` — passes `parent` option to BrowserWindow constructor
- `close()` — closes existing window
- `close()` — no-op for unknown `windowId`
- `destroyAll()` — destroys all tracked windows, clears map

#### `src/renderer/core/app.test.ts`

Test `matchWindowBySearchParams` logic (can extract as pure function for testability):

- Returns `WindowConfig` when `windowType` param matches
- Returns `undefined` when no `windowType` param
- Returns `undefined` when `windowType` doesn't match any config

Test contribution merging (`applyParallelArray`):

- Two plugins contributing `activityBarItems` — both arrays concatenated, not overwritten
- Plugin returning `undefined` for a field — treated as empty array, no crash
- Mixed contributions — plugin A contributes `primaryTitlebarItems`, plugin B contributes `secondaryTitlebarItems`, both present in result

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `src/renderer/core/plugin/contributions.ts` | Add `TitlebarItemDescriptor`, `TitlebarItemProps`; add `primaryTitlebarItems` and `secondaryTitlebarItems` to `PluginConfigContribution` |
| Modify | `src/renderer/core/plugin/index.ts` | Re-export new types |
| Modify | `src/renderer/core/plugin-manager.ts` | Add `applyParallelArray` method |
| Modify | `src/renderer/core/app.tsx` | Replace `applySeriesMerge` with `applyParallelArray`; add `window` namespace; update `matchWindowBySearchParams` to use `windowType` |
| Modify | `src/renderer/core/types.ts` | Rename `WindowConfig.windowId` to `WindowConfig.windowType` |
| Modify | `src/renderer/components/layout/PrimaryTitleBar.tsx` | Render `primaryTitlebarItems` |
| Modify | `src/renderer/components/layout/SecondaryTitleBar.tsx` | Render `secondaryTitlebarItems` |
| Create | `src/main/browser-window-manager.ts` | BrowserWindowManager class + `WindowOpenOptions` type (renderer gets type via IPC inference) |
| Modify | `src/main/ipc/index.ts` | Add `window` namespace |
| Modify | `src/main/core/app.ts` | `browserWindowManager.setMainWindow()` + `destroyAll()` in cleanup + fix `activate` handler |
| Create | `src/renderer/plugins/demo-dashboard/plugin.tsx` | Demo plugin with titlebar button |
| Create | `src/renderer/plugins/demo-dashboard/DashboardWindow.tsx` | Demo sub-window content |
| Modify | `src/renderer/main.tsx` | Register demo plugin + window config |
| Create | `src/main/browser-window-manager.test.ts` | Unit tests for BrowserWindowManager |
| Create | `src/renderer/core/app.test.ts` | Unit tests for matchWindowBySearchParams |

## Edge Cases Addressed

- **Double-click race condition**: BrowserWindowManager uses synchronous `Map.get()` + `Map.set()` in the same tick. Electron main process JS is single-threaded, so two rapid IPC calls are serialized.
- **macOS activate**: Changed to check `this.mainWindow === null` instead of `getAllWindows().length === 0`.
- **Sub-window preload**: Same preload path as main window, ensuring IPC works.
- **Unmatched windowType in sub-window**: Falls through to main window initialization (existing behavior, not changed).
- **Multi-instance windows**: Same `windowType` with different `windowId` values opens independent windows, each rendering the same component. Component reads `windowId` from URL to distinguish instances.
- **Titlebar item ordering**: Items render in plugin registration order (deterministic).
- **Parent window**: Optional `parent: true` attaches sub-window to main window (macOS: follows, minimizes/closes with main).

## Future Considerations

- **Unified window management**: Move main window creation from `MainApp.createWindow()` into `BrowserWindowManager.createMainWindow()`, making all windows managed by one class. `setMainWindow()` is the migration bridge.
- **Instance property pattern**: Migrate from singleton to `MainApp` instance property (like lobehub's `app.browserManager`), unifying all managers.
- **Bounds persistence**: Save/restore sub-window position and size (like lobehub's `WindowStateManager`).
- **Cross-window broadcast**: `broadcastToAllWindows()` for state synchronization between windows.
- **Soft parent positioning**: Center sub-window relative to main window on open (without Electron `parent` attachment).
- **Windows/Linux sub-window cleanup**: When main window closes on non-macOS platforms, call `browserWindowManager.destroyAll()` to close all sub-windows (users expect all windows to close together). V1 only targets macOS where independent sub-windows survive main window close (user can reopen via dock).

## Verification

1. `npm run typecheck` — no type errors
2. `npm run dev` — launch the app
3. Verify demo button appears in SecondaryTitleBar (right side, before Settings)
4. Click the button — new window opens with dashboard content
5. Click again — existing window focuses (no duplicate)
6. Close sub-window, click button — new window created again
7. Close main window on macOS, click dock icon — main window recreates even if sub-windows exist
8. Quit app — no errors, all windows closed cleanly

## References

- Existing plugin pattern: `src/renderer/plugins/demo-notes/plugin.tsx`
- UpdaterService IPC pattern: `src/main/updater/service.ts`
- `exposeAsMainHandlers`: `src/shared/lib/ipc/main.ts:141`
- `matchWindowBySearchParams`: `src/renderer/core/app.tsx:124`
- `WindowConfig` type: `src/renderer/core/types.ts:58` (will rename `windowId` → `windowType`)
- macOS `activate` handler: `src/main/core/app.ts:328`
