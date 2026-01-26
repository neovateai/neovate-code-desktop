# Terminal State Persistence

**Date:** 2026-01-22
**Status:** Implemented

## Context

Terminal tabs should persist their state (scrollback buffer, working directory, environment) across app restarts. When the user reopens the app or switches between repos, they should see their previous terminal output rather than a fresh empty terminal.

## Requirements

- **Full persistence** — survives app restarts (saved to disk)
- **Full terminal state** — scrollback buffer + working directory + environment variables
- **1000 lines** limit per terminal scrollback

## Approach

Use XTerm's `SerializeAddon` to capture and restore the terminal buffer. Persist state to JSON files in the user data directory, keyed by repo path hash and tab ID.

## Architecture

### Data Model

```typescript
interface PersistedTerminalState {
  tabId: string;
  repoPath: string;
  serializedBuffer: string;  // XTerm SerializeAddon output
  cwd: string;               // Last known working directory
  env: Record<string, string>;  // Environment variables at spawn
  savedAt: number;           // Timestamp
  scrollbackLines: number;   // For validation
}
```

### Storage

- Location: `~/.neovate-code-desktop/terminal-state/{repoPathHash}/{tabId}.json`
- Repo path is hashed (MD5, first 12 chars) to avoid filesystem issues
- Max 1000 lines per terminal
- Files deleted when tab is explicitly closed
- Orphaned files pruned after 30 days

### Save Triggers

1. **Debounced on PTY data** — every 2 seconds max while receiving output
2. **Immediate on tab switch** — when tab becomes inactive
3. **On cleanup** — when terminal instance is disposed

### Restore Flow

1. Terminal pane mounts with `isActive=true`
2. Load persisted state via IPC: `terminal.loadState({ repoPath, tabId })`
3. If state exists:
   - Create XTerm instance
   - Write `serializedBuffer` to XTerm (restores visual output)
   - Spawn PTY with saved `cwd` and `env`
4. If no state: normal fresh terminal initialization

### CWD Tracking

- Query PTY's current working directory via `lsof` (macOS) or `/proc/{pid}/cwd` (Linux)
- Called during save to get accurate cwd even after user `cd` commands
- Falls back to initial cwd if query fails

## Files

### New Files

- `src/main/terminal-state/index.ts` — File I/O for terminal state persistence

### Modified Files

- `src/main/ipc/index.ts` — Added handlers: `saveState`, `loadState`, `deleteState`, `getCwd`
- `src/main/pty/manager.ts` — Added `getPid()` method
- `src/renderer/components/ContentPanel/ContentPanelProvider.tsx` — Updated `TerminalInstance` interface
- `src/renderer/components/ContentPanel/panes/TerminalPane.tsx` — Added save/restore logic

### Dependencies

- Added `@xterm/addon-serialize` package

## IPC API

```typescript
terminal: {
  // Existing
  create, write, resize, destroy,
  
  // New
  getCwd: ({ ptyId }) => { cwd: string | null },
  saveState: (state: PersistedTerminalState) => void,
  loadState: ({ repoPath, tabId }) => { state: PersistedTerminalState | null },
  deleteState: ({ repoPath, tabId }) => void,
}
```

## Edge Cases

- **Corrupted state file** — Log warning, start fresh terminal
- **Missing cwd (directory deleted)** — Fall back to repo root
- **Env vars changed externally** — Use saved env, accept drift
- **Tab closed explicitly** — Delete persisted state file
