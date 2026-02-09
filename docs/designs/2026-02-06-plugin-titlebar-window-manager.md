# Plugin Titlebar Contributions + WindowManager

**Date:** 2026-02-06

## Context

The plugin system currently supports contributing UI elements to the Activity Bar, Secondary Sidebar, and Content Panel via `configContributes()`. This design extends that to the Titlebar area, allowing plugins to inject custom elements (e.g., buttons) into the title bar, with support for opening new Electron windows on click.

## Discussion

### Titlebar Rendering Position

The titlebar is split into `PrimaryTitleBar` (left side, repo selector) and `SecondaryTitleBar` (right side, settings button, etc.). Both areas will support plugin contributions, distinguished by `position: 'primary' | 'secondary'`.

### Element Type

Three options were considered: buttons only, buttons + dropdown menus, or arbitrary React components. Arbitrary React components were chosen for maximum flexibility, with visual consistency left to the plugin author.

### WindowManager Design

A `WindowManager` class in the main process follows the `UpdaterService` pattern (`exposeAsMainHandlers` + singleton), exposing `window.open` / `window.close` to the renderer via IPC.

### WindowConfig Registration

Two approaches were considered:
- Collected via `configContributes` (plugin self-contained)
- Manually registered in `RendererApp options.windows`

Manual registration was chosen because `matchWindowBySearchParams()` executes before `configContributes`, and the sub-window code path returns early without calling `configContributes` at all. This timing constraint makes collecting via hooks impossible.

### Sub-window Plugin System

Sub-windows do not need the full plugin lifecycle. The current design intent is that sub-windows only initialize i18n and render the specified component directly. This remains unchanged.

### Contribution Merging Strategy

`applySeriesMerge` uses `defu` which merges arrays by index rather than concatenating. When multiple plugins contribute to the same array field, only the first plugin's items take effect. Switching to `applyParallel` + `flatMap` properly concatenates arrays from all plugins.

## Approach

1. Add `titlebarItems` field to `PluginConfigContribution`, typed as `TitlebarItemDescriptor[]`
2. `PrimaryTitleBar` and `SecondaryTitleBar` components read and render plugin items matching their position
3. Create a `WindowManager` class to manage sub-window lifecycle, exposed via `exposeAsMainHandlers`
4. Fix contribution merging: replace `applySeriesMerge` + `defu` with `applyParallel` + `flatMap`

## Architecture

### TitlebarItemDescriptor

```ts
interface TitlebarItemDescriptor {
  id: string;
  position: 'primary' | 'secondary';
  order?: number;  // default 100
  componentLoader: () => Promise<{ default: ComponentType<TitlebarItemProps> }>;
}

interface TitlebarItemProps {
  app: RendererApp;
}
```

### WindowManager (Main Process)

```
WindowManager
├── open({ windowId, width?, height?, title? })  → create or focus window
├── close({ windowId })                          → close window
├── destroyAll()                                 → cleanup on app quit
└── mainHandlers = exposeAsMainHandlers(...)      → IPC registration
```

- Uses `?windowId=xxx` URL param, reusing `RendererApp.matchWindowBySearchParams()` routing
- Deduplication: if a window with the same `windowId` already exists, focus it instead of creating a duplicate

### Contribution Collection Flow

```
applyParallel('configContributes')
  → [pluginA result, pluginB result, ...]
  → flatMap to concatenate each array field
  → this.contributions
```

### Data Flow

```
Plugin configContributes()
  → titlebarItems: [{ id, position, componentLoader }]
  → PrimaryTitleBar / SecondaryTitleBar renders items

Plugin titlebar component onClick
  → ipcMainCaller.window.open({ windowId: 'xxx' })
  → WindowManager creates BrowserWindow(?windowId=xxx)
  → RendererApp.matchWindowBySearchParams() matches WindowConfig
  → Sub-window component renders
```
