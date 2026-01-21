# Fork Session Feature

**Date:** 2026-01-15

## Context

The Fork session feature allows users to branch a conversation from any previous user message. This is useful when users want to explore alternative paths in a conversation without losing the original context, or when they want to retry a prompt with modifications.

The implementation was inspired by the fork feature in the `takumi` terminal-based client, adapted for the Electron desktop application's React-based UI.

## Discussion

### Key Questions Addressed

1. **State Location**: Where should fork-related state live?
   - **Decision**: Add to main store (`store.tsx`) for global access
   - State includes: `forkModalVisible`, `forkParentUuid`

2. **UI Behavior on Fork**: How should the UI behave when forking?
   - **Decision**: Show a modal with message list for user to select, then truncate messages and pre-fill input

3. **Modal Component**: How to implement the fork selection UI?
   - **Decision**: Create a dedicated `ForkModal` component using existing Dialog UI primitives

4. **Session Scope**: Should fork support cross-session?
   - **Decision**: No, fork only within current session

5. **Backend API**: Is the API ready?
   - **Confirmed**: `session.send` already accepts `parentUuid` parameter

### Technical Challenges Solved

1. **Modal Closing Immediately**: The Dialog component's built-in Escape handling was closing the modal as soon as it opened (the same Escape keypress that triggered the modal).
   - **Solution**: Added 50ms delay in `showForkModal` to let the Escape key event fully propagate before the Dialog mounts

2. **Input Not Filling After Fork**: The `useInputState` hook uses local state with debouncing for performance, creating a one-way sync (local → store works, but store → local only syncs on session switch).
   - **Solution**: Added `forceUpdateKey` counter to `SessionInputState` that gets incremented on external updates (like fork), triggering sync in `useInputState`

## Approach

The fork feature follows a modal-based selection flow:

1. User triggers fork with **double-press Escape**
2. `ForkModal` displays filtered list of user messages (newest first)
3. User selects a message via click or keyboard navigation
4. Messages are truncated to before the selected point
5. Input is pre-filled with the selected message's content
6. User can modify and send, creating a branch via `parentUuid`

## Architecture

### State (store.tsx)

```typescript
// Added to StoreState
forkModalVisible: boolean;
forkParentUuid: string | null;

// Added to SessionInputState
forceUpdateKey: number;  // Triggers sync on external updates
```

### Actions (store.tsx)

```typescript
showForkModal: () => void;      // Opens modal (with 50ms delay)
hideForkModal: () => void;      // Closes modal
fork: (targetMessageUuid: string) => void;  // Executes fork
```

### Fork Action Flow

```
fork(uuid) →
  1. Find target message in session messages
  2. Truncate messages to before target
  3. Set forkParentUuid to target's parentUuid
  4. Pre-fill input with target's content (increment forceUpdateKey)
  5. Close modal
```

### Components

**ForkModal** (`src/renderer/components/ForkModal.tsx`)
- Props: `open`, `onClose`, `messages`, `onSelect`
- Filters messages to show only user messages (excludes hidden, canceled, tool results, bash stdout)
- Displays timestamp and truncated preview (80 chars)
- Keyboard navigation: ↑/↓ navigate, Enter select, Escape close

**WorkspacePanel Integration**
- Connects fork state/actions from store
- Passes `handleShowForkModal` to ChatInput
- Renders ForkModal with current session messages

### Message Flow on Send

```
sendMessage() →
  1. Check if forkParentUuid is set
  2. Pass parentUuid to session.send API
  3. Clear forkParentUuid after sending
```

### Input Sync Mechanism

```
useInputState hook:
  - Maintains localValue for performance (debounced store sync)
  - Watches forceUpdateKey for external updates
  - When forceUpdateKey changes → sync store value to local
```

### Trigger Mechanism

The double-press Escape is handled by `useDoublePress` hook in `useInputHandlers`:
- First Escape: triggers cancel/clear (single press behavior)
- Second Escape (within 1000ms): triggers `onShowForkModal`

## Files Modified

- `src/renderer/store.tsx` - Fork state and actions
- `src/renderer/components/ForkModal.tsx` - New modal component
- `src/renderer/components/WorkspacePanel.tsx` - Fork integration
- `src/renderer/hooks/useInputState.ts` - forceUpdateKey sync mechanism
