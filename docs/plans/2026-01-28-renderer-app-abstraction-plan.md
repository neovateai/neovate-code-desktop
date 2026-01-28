---
title: RendererApp Abstraction Phase 1
type: refactor
date: 2026-01-28
deepened: 2026-01-28
---

# RendererApp Abstraction Phase 1

## Enhancement Summary

**Deepened on:** 2026-01-28
**Research agents used:** kieran-typescript-reviewer, code-simplicity-reviewer, architecture-strategist, pattern-recognition-specialist, performance-oracle, security-sentinel, julik-frontend-races-reviewer, best-practices-researcher, Context7 (React, Zustand docs)

### Key Improvements
1. Use shared `PluginManager` class
2. Use `react-error-boundary` package for error handling
3. Minimal RendererApp class (~25 lines)
4. Single `beforeStart` hook (called after hydrate, before render)

### Design Decisions
- Single hook: `beforeStart` - covers most plugin needs
- `enforce: 'pre' | 'post'` handled by PluginManager
- No state machine, no unmount, no cleanup

---

## Overview

Abstract the renderer process into a reusable `RendererApp` class with a plugin system, mirroring the MainApp pattern. This enables another Electron app to import the renderer as a submodule and customize it through plugins.

**Design doc:** `docs/designs/2026-01-28-renderer-app-abstraction.md`
**Brainstorm:** `docs/brainstorms/2026-01-28-renderer-abstraction-brainstorm.md`

## Motivation

- Another Electron app needs to reuse this renderer
- Enable customization via plugins (theming, UI extensions, feature toggles)
- Better separation for unit testing
- Support multi-window with different content per window

## Acceptance Criteria

- [x] `RendererPluginHooks` interface with `beforeStart` hook
- [x] `WindowConfig` interface with `windowId` and `render`
- [x] `RendererAppOptions<H>` interface with `plugins` and `windows`
- [x] `RendererApp<H>` class with `start()` method
- [x] Use shared `PluginManager` for hook execution
- [x] Error boundary via `react-error-boundary` package
- [x] `main.tsx` simplified to use RendererApp
- [x] Default behavior unchanged (renders `<App />` with no config)
- [ ] Multi-window routing works via `?windowId=xxx` URL param

## Implementation Plan

### Step 1: Create Type Definitions

**File:** `src/renderer/core/types.ts` (new)

```typescript
import type { ComponentType } from 'react';
import type { DefinePlugin } from '@/shared/lib/plugin-manager';
import type { useStore } from '../store';

/**
 * Renderer plugin hooks interface.
 */
export interface RendererPluginHooks {
  /**
   * Called after store hydration, before React render.
   */
  beforeStart(opts: { store: typeof useStore }): void | Promise<void>;
}

/**
 * Renderer plugin type
 */
export type RendererPlugin<H extends RendererPluginHooks = RendererPluginHooks> = DefinePlugin<H>;

/**
 * Configuration for a window type
 */
export interface WindowConfig {
  windowId: string;
  render?: () => Promise<{ default: ComponentType }>;
}

/**
 * Options for RendererApp
 */
export interface RendererAppOptions<H extends RendererPluginHooks = RendererPluginHooks> {
  plugins?: DefinePlugin<H>[];
  windows?: WindowConfig[];
}
```

---

### Step 2: Install react-error-boundary

Use the well-maintained `react-error-boundary` package instead of a custom component.

```bash
npm install react-error-boundary
```

### Research Insights: react-error-boundary

**Why use react-error-boundary:**
- Well-maintained by Brian Vaughn (React core team member)
- Provides `resetErrorBoundary` for retry functionality
- Supports `onError` callback for logging
- TypeScript support built-in
- Works with React DOM and React Native

**Key Features:**
- `FallbackComponent` - React component for error UI
- `fallbackRender` - Render prop for inline fallback
- `onError` - Callback for error logging
- `onReset` - Callback when error boundary resets
- `resetErrorBoundary` - Function to reset and retry

---

### Step 3: Create RendererApp Class

**File:** `src/renderer/core/app.tsx` (new)

```typescript
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import type { RendererAppOptions, WindowConfig, RendererPluginHooks } from './types';
import { PluginManager } from '@/shared/lib/plugin-manager';
import { useStore } from '../store';
import { hydrateStore, setupPersistence } from '../persistence';
import { ToastProvider } from '../components/ui/toast';
import App from '../App';

function WindowLoadError({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" style={{ padding: 20, textAlign: 'center' }}>
      <h2>Failed to load window</h2>
      <p style={{ color: 'red' }}>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export class RendererApp<H extends RendererPluginHooks = RendererPluginHooks> {
  private options: RendererAppOptions<H>;
  private pluginManager: PluginManager<H>;

  constructor(options?: RendererAppOptions<H>) {
    this.options = options ?? {};
    this.pluginManager = new PluginManager(this.options.plugins ?? []);
  }

  async start(container: HTMLElement): Promise<void> {
    await hydrateStore(useStore);
    await this.pluginManager.applySeries('beforeStart', this, { args: [{ store: useStore }] });

    const windowConfig = this.matchWindow();
    const Content = windowConfig?.render ? React.lazy(windowConfig.render) : App;

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ErrorBoundary FallbackComponent={WindowLoadError}>
          <ToastProvider position="bottom-right">
            <Suspense fallback={null}>
              <Content />
            </Suspense>
          </ToastProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    setupPersistence(useStore);
  }

  private matchWindow(): WindowConfig | undefined {
    if (!this.options.windows?.length) return undefined;
    const windowId = new URLSearchParams(location.search).get('windowId');
    if (!windowId) return this.options.windows[0];
    return this.options.windows.find((w) => w.windowId === windowId) ?? this.options.windows[0];
  }
}
```

---

### Step 4: Persistence (No Changes Needed)

**File:** `src/renderer/persistence.ts` - No modifications required.

The existing `setupPersistence` already handles `beforeunload` internally. Since there's no `unmount()` timing in Electron renderer, we don't need a cleanup return value.

---

### Step 5: Simplify main.tsx

**File:** `src/renderer/main.tsx`

Replace entire file with:

```typescript
import './index.css';
import { RendererApp } from './core';

new RendererApp().start(document.getElementById('root')!);
```

---

### Step 6: Export Types

**File:** `src/renderer/core/index.ts` (new)

```typescript
export { RendererApp } from './app';
export type {
  RendererPluginHooks,
  RendererPlugin,
  WindowConfig,
  RendererAppOptions,
} from './types';
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/shared/lib/plugin-manager.ts` | **New** - Shared PluginManager class |
| `src/renderer/core/types.ts` | **New** - Type definitions |
| `src/renderer/core/app.tsx` | **New** - RendererApp class |
| `src/renderer/core/index.ts` | **New** - Public exports |
| `src/renderer/main.tsx` | Simplify to 3 lines |
| `package.json` | **Modify** - Add react-error-boundary dependency |

**No changes to:**
- `src/renderer/persistence.ts` - already handles beforeunload
- `src/renderer/store/index.ts` - stays as singleton
- `src/renderer/App.tsx` - stays as-is
- `src/renderer/components/*` - no changes

---

## Simplification Notes

| Removed | Reason |
|---------|--------|
| `unmount()` method | Electron kills renderer process on window close |
| `init` / `ready` / `destroy` hooks | Single `beforeStart` hook covers current needs |
| State machine | One-way startup flow |
| `PluginContext` / `usePlugins` hook | No consumers until Phase 3 |

**Estimated LOC:** ~60

**Directory structure mirrors `main/core`:**
```
src/renderer/core/
├── app.tsx      # RendererApp class
├── types.ts     # Type definitions
└── index.ts     # Public exports
```

---

## Testing

1. `npm run dev` - verify app starts normally
2. Verify store hydration works
3. Verify persistence works (beforeunload saves state)
4. Verify ToastProvider works
5. Verify error boundary catches lazy load failures

---

## Usage Examples

### Default (No Changes)

```typescript
import { RendererApp } from './core';

// Behaves exactly like before
new RendererApp().start(document.getElementById('root')!);
```

### With Plugins

```typescript
import { RendererApp, type RendererPluginHooks } from './core';

interface MyHooks extends RendererPluginHooks {
  onThemeChange?: (theme: string) => void;
}

const analyticsPlugin = {
  name: 'analytics',
  beforeStart({ store }) {
    console.log('Analytics initialized with state:', store.getState());
  },
};

new RendererApp<MyHooks>({
  plugins: [analyticsPlugin],
}).start(document.getElementById('root')!);
```

### Multi-Window

```typescript
import { RendererApp } from './core';

new RendererApp({
  plugins: [brandingPlugin],
  windows: [
    { windowId: 'main', render: () => import('./App') },
    { windowId: 'settings', render: () => import('./windows/Settings') },
  ],
}).start(document.getElementById('root')!);
```

---

## Security Considerations

Based on security-sentinel review:

1. **Plugin Store Access:** Restricted via `PluginStoreApi` interface (not full Zustand store)
2. **URL Parameter Parsing:** Validated against known windowIds with dev-mode warning
3. **Dynamic Imports:** Only from predefined paths in `windows` config

---

---

## References

- Design: `docs/designs/2026-01-28-renderer-app-abstraction.md`
- Brainstorm: `docs/brainstorms/2026-01-28-renderer-abstraction-brainstorm.md`
- MainApp pattern: `docs/plans/2026-01-28-refactor-mainapp-wrapper-plan.md`
- Current main.tsx: `src/renderer/main.tsx:1-25`
- Store: `src/renderer/store/index.ts`
- Persistence: `src/renderer/persistence.ts`
- React lazy docs: https://react.dev/reference/react/lazy
- Zustand persist: https://zustand.docs.pmnd.rs/integrations/persisting-store-data
