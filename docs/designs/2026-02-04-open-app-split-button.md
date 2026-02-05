# Open App Split Button

## Overview

Refactor `OpenAppButton` into a split button pattern with a default app preference that persists across sessions.

## Current State

Single dropdown button showing "Open" text with chevron. User must click dropdown and select an app every time.

## Design

### Component Structure

```
┌─────────────┬───┐
│ [icon]      │ ▼ │
└─────────────┴───┘
  Left: click    Right: dropdown
  to open        to select & save
```

- **Left button**: Shows icon of default app, one-click to open
- **Right button**: Chevron dropdown to select different app
- When dropdown item selected: save as default + open the app

### Fallback Logic

When no preference is saved:
1. On component mount, auto-detect available apps via `useEffect`
2. Use first detected app as effective default
3. Once user explicitly selects an app, save to store

### UI States

| State | Left Button Shows | Left Click Action |
|-------|-------------------|-------------------|
| No saved pref, apps not loaded | "Open" text (disabled) | Nothing |
| No saved pref, apps loaded | First app icon | Opens with first app |
| Saved pref exists | Saved app icon | Opens with saved app |

## Implementation

### 1. Store Changes (`src/renderer/store/slices/desktopSettings.ts`)

Add to `DesktopSettingsSliceState`:
```ts
defaultOpenApp: App | null;
```

Add to `DesktopSettingsSliceActions`:
```ts
setDefaultOpenApp: (app: App | null) => void;
```

Add to `defaultDesktopSettings`:
```ts
defaultOpenApp: null,
```

Add action implementation:
```ts
setDefaultOpenApp: (defaultOpenApp: App | null) => {
  set({ defaultOpenApp });
},
```

### 2. Persistence Changes (`src/renderer/persistence.ts`)

Add to `PersistedState` interface:
```ts
defaultOpenApp: App | null;
```

Add to `getPersistableState()`:
```ts
defaultOpenApp: state.defaultOpenApp ?? null,
```

Add to `hydrateStore()` destructuring:
```ts
defaultOpenApp = null,
```

Add to `store.setState()`:
```ts
defaultOpenApp,
```

### 3. Component Changes (`src/renderer/components/OpenAppButton.tsx`)

Refactor to split button:
- Import `App` type for store typing
- Get `defaultOpenApp` and `setDefaultOpenApp` from store
- Track `effectiveDefault`: saved pref or first detected app
- Left button: icon + click handler to open with effective default
- Right button: dropdown trigger with chevron
- On dropdown select: call `setDefaultOpenApp(app)` then open

Button styling:
- Use button group pattern with shared border
- Left: `rounded-l-md rounded-r-none`
- Right: `rounded-r-md rounded-l-none border-l`
