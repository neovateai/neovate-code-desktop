# Interactive Terminal with PTY and xterm.js

**Date:** 2026-01-13

## Context

The existing `Terminal.tsx` component is a UI shell with tabs, output display, and input—but no real shell execution. It simply echoes commands as placeholders. The goal is to implement a fully functional interactive terminal that users can use to run shell commands directly within the desktop application.

## Discussion

### Use Case
The primary use case is an **interactive shell** for users to run commands directly, not just displaying AI agent command output.

### Backend Approach
Three options were considered:
1. **node-pty** (chosen) - Most popular, native bindings via node-gyp, battle-tested
2. **xterm-addon-attach + WebSocket** - Pure JS via WebAssembly, no native compilation, but newer and less mature
3. **child_process only** - Simpler but lacks PTY features (no colors, no interactive programs)

### Frontend Rendering
Two options were considered:
1. **xterm.js** (chosen) - Full terminal emulator with ANSI colors, cursor control, vim/nano support
2. **Current simple UI** - Keep text-based output without ANSI support

### Multi-Tab Support
Each tab should create a **separate PTY instance** with its own shell session.

### Architecture Approach
Two approaches were evaluated:
1. **IPC-based** (chosen) - Uses existing typesafe IPC system, clean separation, fits current architecture
2. **WebSocket-based** - Direct binary streaming with lowest latency, but more complex and harder to make typesafe

## Approach

Implement an IPC-based terminal system where:
- Main process manages PTY instances via a `PTYManager` singleton
- Renderer communicates via existing typesafe IPC handlers
- Each terminal tab gets its own xterm.js instance connected to a dedicated PTY
- PTY output streams back to renderer via Electron IPC events

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Terminal.tsx                                        │   │
│  │  ├── xterm.js instance per tab                      │   │
│  │  ├── xterm-addon-fit (auto-resize)                  │   │
│  │  └── Calls mainCaller.terminal.*                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PTYManager                                          │   │
│  │  ├── Map<ptyId, IPty>                               │   │
│  │  ├── create(cwd, shell) → ptyId                     │   │
│  │  ├── write(ptyId, data)                             │   │
│  │  ├── resize(ptyId, cols, rows)                      │   │
│  │  ├── destroy(ptyId)                                 │   │
│  │  └── onData → sends to renderer via IPC event       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Main Process Components

**PTYManager (`src/main/pty/manager.ts`):**
- Singleton managing all PTY instances
- Methods: `create()`, `write()`, `resize()`, `destroy()`
- Emits data/exit events to renderer via IPC

**IPC Handlers (addition to `src/main/ipc/index.ts`):**
```typescript
terminal: {
  create: createMainHandler(async ({ cwd }) => ptyManager.create({ cwd })),
  write: createMainHandler(async ({ ptyId, data }) => ptyManager.write(ptyId, data)),
  resize: createMainHandler(async ({ ptyId, cols, rows }) => ptyManager.resize(ptyId, cols, rows)),
  destroy: createMainHandler(async ({ ptyId }) => ptyManager.destroy(ptyId)),
}
```

### Renderer Components

**Terminal.tsx changes:**
- Replace `Terminal.Output` with `Terminal.XTermView` using xterm.js
- Remove `Terminal.Input` (xterm.js handles input natively)
- Each tab maintains: `{ id, ptyId, xterm, fitAddon }`
- ResizeObserver triggers `mainCaller.terminal.resize()`

### IPC Events (Main→Renderer)

Use Electron's native IPC events for PTY output streaming:
```typescript
// Main
BrowserWindow.webContents.send('terminal:data', { ptyId, data });

// Renderer
window.electron.ipcRenderer.on('terminal:data', callback);
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `node-pty` | PTY spawning in main process |
| `xterm` | Terminal emulator UI |
| `xterm-addon-fit` | Auto-resize terminal to container |

### Build Considerations

- `node-pty` requires `electron-rebuild` after install
- May need Vite configuration for xterm.js CSS imports

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/main/pty/manager.ts` | New - PTYManager class |
| `src/main/pty/index.ts` | New - exports |
| `src/main/ipc/index.ts` | Add terminal handlers |
| `src/main/preload.ts` | Expose `ipcRenderer.on` for events |
| `src/renderer/components/Terminal.tsx` | Replace with xterm.js |
| `package.json` | Add node-pty, xterm, xterm-addon-fit |

### Implementation Order

1. Install dependencies, configure electron-rebuild
2. Implement PTYManager
3. Add IPC handlers
4. Update preload for events
5. Rewrite Terminal.tsx with xterm.js
6. Test multi-tab functionality
