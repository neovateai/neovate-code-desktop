# MainApp Refactor

**Date:** 2026-01-28

## Context

The current `src/main/index.ts` contains all Electron main process initialization inline - window creation, menu setup, tray, IPC handlers, server management, and cleanup. The goal is to refactor this into a `MainApp` class for better code organization and to enable sharing across repositories via git submodule in the future.

## Discussion

### Motivation
- Code organization: encapsulate main process logic in a class
- Future sharing: ability to use as git submodule in other repos

### Approaches Considered

1. **Single self-contained class** - All logic (server, PTY, updater) inside one MainApp file. Easy to submodule but requires restructuring.

2. **Wrapper over existing modules** - MainApp delegates to existing managers (neovateServerManager, ptyManager, etc.). Minimal changes, keeps current structure.

3. **Builder pattern** - Fluent API for optional components. Maximum flexibility but unnecessary complexity (YAGNI).

### Decision
Start with **Approach 2 (wrapper)** for now. Can refactor to self-contained class later when actually needed for submodule sharing.

### API Shape
- Constructor takes optional `neovateOptions` which passes through to `runNeovate`
- Single `start()` method to initialize everything
- No `stop()` method needed - Electron's `before-quit` event handles cleanup

### File Location
`src/main/app.ts` - flat and simple, next to index.ts

## Approach

Create a `MainApp` class that wraps the existing initialization logic from `index.ts`. The class delegates to existing singleton managers (neovateServerManager, ptyManager, updaterService) rather than reimplementing their logic.

## Architecture

```typescript
// src/main/app.ts
interface MainAppOptions {
  neovateOptions?: Record<string, unknown>;
}

class MainApp {
  constructor(options?: MainAppOptions);
  start(): Promise<void>;
}
```

```typescript
// src/main/index.ts
import { MainApp } from './app';

const app = new MainApp({ neovateOptions: {} });
app.start();
```

### MainApp.start() responsibilities
- Create main window with preload script
- Setup menu (Settings, Edit, View, Window)
- Create system tray with context menu
- Register IPC handlers
- Initialize updater service
- Setup cleanup on `before-quit` event

### What stays the same
- `src/main/server/` - neovateServerManager singleton
- `src/main/pty/` - ptyManager singleton
- `src/main/updater/` - updaterService
- `src/main/ipc/` - typesafe IPC handlers
- `src/main/terminal-state/` - terminal persistence
