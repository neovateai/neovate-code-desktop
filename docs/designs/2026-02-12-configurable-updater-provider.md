# Configurable Updater Provider for MainApp

**Date:** 2026-02-12

## Context

The current `UpdaterService` does not support runtime configuration of the update provider or feedURL. It relies entirely on build-time `publish` config from electron-builder (GitHub provider for production, generic provider for local builds). As `MainApp` is being prepared for external consumption, consumers need the ability to configure their own update server at construction time.

## Discussion

**Config shape:** We use `FeedURLOptions` (derived from `AppUpdater['setFeedURL']` parameter type) wrapped in an `UpdaterOptions` interface. The interface wrapper allows future extensibility (e.g., adding behavior options) without changing the `MainAppOptions` shape.

**Async feedURL resolution:** The feedURL may need to be resolved asynchronously (e.g., fetched from a config server). Three approaches were evaluated:

1. **Sync only** — consumer resolves before constructing `MainApp`. Simple but pushes async burden to the consumer.
2. **Async function support** — accept `AllPublishOptions | (() => Promise<AllPublishOptions>)`, awaited during `init()` before the first auto-check. Keeps the init flow linear.
3. **Deferred `configureUpdater()` method** — rejected because it creates a race condition with auto-check on startup. The updater would need to track "configured vs not configured" state and gate the check interval, adding significant state flow complexity.

**Mutability:** Dynamic `setFeedURL` after init was rejected. Changing the provider at runtime makes the update state flow (checking → downloading → downloaded → installing) difficult to control. Config is set once and immutable.

**Default behavior:** When no updater config is provided, the updater falls back to build-time electron-builder config — preserving current behavior for existing consumers.

## Approach

Add an `updater` field to `MainAppOptions` that accepts an `UpdaterOptions` object with an optional `feedURL` property (`FeedURLOptions | (() => Promise<FeedURLOptions>)`). The config flows through `MainApp` to `UpdaterService.init()`, where it is resolved (awaited if async) and applied via `autoUpdater.setFeedURL()`. The updater init is fire-and-forget — it does not block renderer loading.

- Provider/feedURL only — no behavior options (autoDownload, checkInterval, etc.)
- Set once at construction, immutable after init
- Non-blocking init: renderer loads immediately, updater resolves config in the background

## Architecture

**Type changes** (`src/main/core/types.ts`):
```typescript
import type { AppUpdater } from 'electron-updater';

export type FeedURLOptions = Parameters<AppUpdater['setFeedURL']>[0];

export interface UpdaterOptions {
  feedURL?: FeedURLOptions | (() => Promise<FeedURLOptions>);
}

export interface MainAppOptions {
  neovateOptions?: NeovateOptions;
  updater?: UpdaterOptions;
}
```

**MainApp** (`src/main/core/app.ts`):
- Store `updater` from constructor
- Pass to `updaterService.init(mainWindow, updater)` in `createWindow()` — fire-and-forget (not awaited)

**UpdaterService** (`src/main/updater/service.ts`):
- `init()` accepts optional `UpdaterOptions`
- If provided: resolve feedURL (await if function), call `autoUpdater.setFeedURL(resolved)`
- Then proceed with existing setup (event listeners, scheduled checks)
- Re-entry (macOS activate): updates `mainWindow` reference, re-runs `startScheduledChecks()` (idempotent)

**Init flow:**
```
MainApp.createWindow()
  → loadURL() (renderer loads immediately)
  → updaterService.init(mainWindow, updater) (fire-and-forget)
    → if feedURL: resolve → autoUpdater.setFeedURL(resolved)
    → setup event listeners (guarded by isAutoUpdaterSetup)
    → start scheduled checks (guarded by checkInterval)
```
