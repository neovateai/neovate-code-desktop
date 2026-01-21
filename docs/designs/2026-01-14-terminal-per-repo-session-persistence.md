# Terminal Per-Repo Session Persistence

**Date:** 2026-01-14

## Context

The application renders a Terminal component in the secondary panel. Previously, a single Terminal was rendered based on `selectedRepoPath`, which meant switching repos would destroy the terminal instance and lose all session state (command history, running processes, PTY connections).

The goal is to preserve terminal sessions when switching between repos, allowing users to quickly return to a previous repo's terminal without losing context.

## Discussion

**Key Questions Explored:**

1. **Session State Preservation**: Should terminals preserve full session state (command history, running processes, PTY connections) or just mount quickly with a fresh terminal?
   - **Decision**: Preserve full session state including PTY connections and command history.

2. **Lifecycle Management**: Should inactive terminals be hidden (display:none) or fully unmounted to save resources?
   - **Decision**: Use `display: none` to hide inactive terminals while keeping them mounted. This preserves the xterm instance, PTY connection, and all state.

3. **Persistence Scope**: Should visited repos persist across app restarts (localStorage) or just for the current session?
   - **Decision**: Session-only persistence. The `visitedRepoPaths` set resets when the app restarts.

## Approach

Render a Terminal component for each repo the user has visited during the current session. Track visited repos in React state and show/hide terminals based on the currently selected repo.

This approach:
- Preserves PTY connections and running processes
- Maintains command history in xterm buffer
- Provides instant switching between repo terminals
- Avoids memory/resource issues from unbounded terminal creation (only visited repos get terminals)

## Architecture

**Components Modified:**

1. **Terminal.tsx**
   - Added `hidden?: boolean` prop
   - Root container applies `display: none` when `hidden` is true
   - All internal state (tabs, PTY connections, xterm instances) preserved when hidden

2. **App.tsx**
   - Added `visitedRepoPaths` state as `Set<string>`
   - `useEffect` adds `selectedRepoPath` to set when it changes
   - Renders `<Terminal>` for each path in `visitedRepoPaths`
   - Passes `hidden={repoPath !== selectedRepoPath}` to show only active terminal

**Data Flow:**

```
selectedRepoPath changes
    ↓
useEffect adds to visitedRepoPaths Set
    ↓
Array.from(visitedRepoPaths) triggers re-render
    ↓
Each Terminal receives hidden prop based on selection
    ↓
Active terminal: display: flex
Inactive terminals: display: none (PTY still connected)
```

**Memory Considerations:**

- Each terminal maintains PTY process and xterm instance
- For typical usage (< 10 repos per session), resource usage is acceptable
- Future enhancement: could add LRU eviction if memory becomes a concern
