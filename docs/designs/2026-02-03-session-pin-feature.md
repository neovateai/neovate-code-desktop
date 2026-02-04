# Session Pin Feature

**Date:** 2026-02-03

## Context

The application needed a way for users to pin important sessions so they remain easily accessible at the top of the sidebar, regardless of sorting or filtering options. The existing session list showed sessions sorted by creation or modification time, making it difficult to quickly access frequently-used sessions.

## Discussion

### Key Questions Resolved

1. **Pin Scope**: Should pinned sessions be stored globally or per-workspace?
   - **Decision**: Global (single set of pinned session IDs across all repos) for simpler implementation.

2. **UI Style**: Should pinned sessions have a separate visual section header?
   - **Decision**: No header, just appear first with a filled pin icon for visual distinction.

3. **Pinned Session Placement**: Where should pinned sessions appear?
   - **Decision**: Pinned sessions should render **before** the "Sessions" title bar, not within the session list.

4. **Session List Filtering**: Should pinned sessions appear in both locations?
   - **Decision**: No, pinned sessions should be hidden from the original session list and only appear in the dedicated pinned section at the top.

## Approach

- Store pinned session IDs in a global array (`pinnedSessions: string[]`) in the Zustand store
- Persist pinned sessions to local storage alongside other UI state
- Create a dedicated `PinnedSessionList` component rendered above the sidebar title bar
- Filter out pinned sessions from `ChronologicalSessionList` and `RepoSessionList`
- For `multiProjectSupport=false` mode, pinned sessions for the current repo still appear at the top
- Provide visual feedback: filled pin icon for pinned, outline for unpinned, PinOff icon on hover for unpin action

## Architecture

### Store Changes (`src/renderer/store/index.ts`)

```typescript
// State
pinnedSessions: string[]

// Actions
pinSession: (sessionId: string) => void
unpinSession: (sessionId: string) => void
togglePinSession: (sessionId: string) => void
```

### Persistence (`src/renderer/persistence.ts`)

Added `pinnedSessions: string[]` to:
- `PersistedState` interface
- `getPersistableState()` function
- `hydrateStore()` destructuring and `store.setState()`

### UI Components (`src/renderer/components/RepoSidebar.tsx`)

**New Component: `PinnedSessionList`**
- Renders before `<SidebarTitleBar />`
- Collects all pinned sessions across workspaces
- Shows filled `Pin` icon, hover shows `PinOff` to unpin
- Context menu includes "Rename", "Unpin", "Delete"

**Modified: `ChronologicalSessionList`**
- Filters out sessions where `pinnedSessions.includes(session.sessionId)`
- Added `togglePinSession` action and "Pin" context menu item

**Modified: `RepoSessionList`**
- Filters out pinned sessions from the session list
- Added `togglePinSession` action
- Context menu shows "Pin"/"Unpin" based on current state
- Hover button shows `Pin` or `PinOff` icon accordingly

### Visual Behavior

| State | Icon (Default) | Icon (Hover) | Context Menu |
|-------|----------------|--------------|--------------|
| Pinned | Filled Pin | PinOff | "Unpin" |
| Unpinned | Comment | Pin | "Pin" |
