# Cmd+N New Chat Keyboard Shortcut

**Date:** 2026-01-27

## Context

The application needed a keyboard shortcut to quickly create a new chat session within the currently selected workspace. This is a common pattern in chat/messaging applications (similar to Cmd+N for "new document" in other apps) that improves user productivity by avoiding mouse navigation to create new conversations.

The existing codebase already had patterns for keyboard shortcuts via Electron's menu system (Cmd+, for Settings, Cmd+Option+T for theme toggle) and a `createSession()` function in the Zustand store for creating new chat sessions.

## Discussion

### Behavior Questions

**Q: Should Cmd+N work when no workspace is selected?**
A: No. The shortcut should only create a new chat when a workspace is already selected. If no workspace is selected, the shortcut does nothing (silent behavior).

**Q: Should the chat input be focused after creating a new session?**
A: Yes. After creating the new chat, the input should be automatically focused so the user can immediately start typing.

### Approach Alternatives Explored

Three approaches were considered:

1. **Full IPC Flow (Like Settings/Theme)** - Add menu item in main process with accelerator, send IPC event to renderer, handle in App.tsx
   - Pros: Consistent with existing patterns, shows in menu bar
   - Cons: More files to modify (3 files), more complex

2. **Renderer-Only Global Keydown** - Add global keydown listener directly in App.tsx
   - Pros: Single file change, simpler, no IPC needed
   - Cons: No menu bar visibility, won't work when window not focused

3. **Hybrid (Menu + Store Action)** - Combine menu with a store flag for focus management
   - Pros: Clean separation, testable
   - Cons: Adds UI flag to store

**Decision:** Approach B (Renderer-Only Global Keydown) was chosen for simplicity. The shortcut only needs to work when the app is focused, and menu bar visibility was not a requirement.

### Focus Implementation

Two sub-options for focusing the chat input:

1. **Custom DOM Event** - Dispatch `chat-input:focus` event that ChatInput listens for
2. **Store Flag** - Add `shouldFocusChatInput` flag to store

**Decision:** Option 1 (Custom DOM Event) was chosen to avoid polluting the store with transient UI state.

### Edge Cases

- **Settings Page Open:** Shortcut is ignored when `showSettings` is true
- **Onboarding Modal Open:** Shortcut is ignored when `onboardingVisible` is true
- **No Workspace Selected:** Shortcut does nothing (silent)

## Approach

Implement a renderer-only solution using a global `keydown` event listener in `App.tsx` that:

1. Intercepts Cmd+N (Mac) or Ctrl+N (Windows/Linux)
2. Prevents default browser behavior
3. Checks preconditions (workspace selected, not in settings/onboarding)
4. **Follows the same logic as the "New Chat" button in RepoSidebar:**
   - If the most recent session has 0 messages → reuse it (just select it)
   - Otherwise → create a new session
5. Dispatches a custom `chat-input:focus` event

The ChatInput component listens for this custom event and focuses its textarea.

## Architecture

### Data Flow

```
User presses Cmd+N
    ↓
Global keydown listener in App.tsx
    ↓
Check: showSettings || onboardingVisible?
    ├── Yes → Return (do nothing)
    └── No  → Continue
                ↓
Check: selectedWorkspaceId exists?
    ├── No  → Return (do nothing)
    └── Yes → Get workspace sessions sorted by modified (newest first)
                    ↓
              Check: topSession.messageCount === 0?
                ├── Yes → selectSession(topSession.sessionId)  // Reuse empty
                └── No  → createSession()                      // Create new
                    ↓
              Dispatch CustomEvent('chat-input:focus')
                    ↓
              ChatInput receives event → focus textarea
```

### Files Modified

| File | Change |
|------|--------|
| `src/renderer/App.tsx` | Added `useEffect` with global keydown listener for Cmd+N |
| `src/renderer/components/ChatInput/ChatInput.tsx` | Added `useEffect` to listen for `chat-input:focus` event |

### Implementation Details

**App.tsx:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();

      const {
        selectedWorkspaceId,
        sessions,
        selectSession,
        createSession,
        showSettings,
        onboardingVisible,
      } = useStore.getState();

      if (showSettings || onboardingVisible) return;

      if (selectedWorkspaceId) {
        // Follow same logic as "New Chat" button in RepoSidebar
        const workspaceSessions = (sessions[selectedWorkspaceId] || [])
          .slice()
          .sort((a, b) => b.modified - a.modified);
        const topSession = workspaceSessions[0];
        const isTopSessionEmpty = topSession && topSession.messageCount === 0;

        if (isTopSessionEmpty) {
          selectSession(topSession.sessionId);
        } else {
          createSession();
        }

        window.dispatchEvent(new CustomEvent('chat-input:focus'));
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**ChatInput.tsx:**
```typescript
useEffect(() => {
  const handleFocusRequest = () => {
    textareaRef.current?.focus();
  };
  window.addEventListener('chat-input:focus', handleFocusRequest);
  return () => window.removeEventListener('chat-input:focus', handleFocusRequest);
}, []);
```

### Key Design Decisions

- **Empty dependency array** - Listener registered once on mount
- **`useStore.getState()`** - Gets fresh state without adding dependencies to useEffect
- **`e.preventDefault()`** - Stops browser's default Cmd+N behavior (new window)
- **Namespaced event** - `chat-input:focus` avoids collisions with other events
- **Reuse empty sessions** - Matches "New Chat" button behavior to prevent creating multiple empty sessions
