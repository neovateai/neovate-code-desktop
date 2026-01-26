# Session Rename via Context Menu

**Date:** 2026-01-22

## Context

The goal is to add a right-click context menu to the session list in the RepoSidebar component, allowing users to rename sessions. The initial scope is intentionally minimal: only a "Rename" action, with inline editing similar to Finder's rename behavior.

## Discussion

### Rename UX Approach
Two options were considered for the rename interaction:
1. **Inline editing** - Turn session text into an editable input field directly in the list (like Finder rename)
2. **Dialog/Modal** - Open a small dialog with an input field and Save/Cancel buttons

**Decision:** Inline editing was chosen for a more native, seamless experience.

### State Management Approach
Two approaches were evaluated for managing the editing state:

1. **Local state in RepoSidebar (Approach A)**
   - Simple, self-contained in one component
   - No store changes needed
   - Easy to understand
   - Con: Editing state could be lost on unexpected re-renders

2. **Editing state in Zustand Store (Approach B)**
   - More robust if other components need to know editing state
   - Consistent with existing patterns
   - Con: Overkill for a simple local UI interaction, requires more files to modify

**Decision:** Local state (Approach A) was chosen for simplicity.

### Context Menu Implementation
Initial implementation incorrectly used the regular `Menu` component with a hacky `onContextMenu` redirect. The correct solution is to use the dedicated `ContextMenu` component from `@base-ui/react/context-menu`, which natively handles right-click and long-press triggers.

### Persistence
The rename must persist to the backend, not just update local state. This requires:
1. Calling `request('session.config.setSummary', { cwd, sessionId, summary })` to persist
2. Then calling `updateSession()` to update local Zustand state

## Approach

1. Create a new `ui/context-menu.tsx` component wrapping `@base-ui/react/context-menu`
2. Add local state in RepoSidebar for `editingSessionId` and `editingValue`
3. Wrap each session item with `ContextMenu` and `ContextMenuTrigger`
4. On right-click, show context menu with "Rename" option
5. On "Rename" click, switch session item to inline edit mode
6. On Enter/blur, save to backend and update local state
7. On Escape, cancel without saving

## Architecture

### New Component: `ui/context-menu.tsx`
```tsx
// Exports from @base-ui/react/context-menu
ContextMenu          // Root component
ContextMenuTrigger   // Wraps target element, triggers on right-click
ContextMenuPopup     // Portal + Positioner + Popup wrapper
ContextMenuItem      // Individual menu items
ContextMenuSeparator // Visual divider
```

### RepoSidebar Changes

**New Local State:**
```tsx
const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
const [editingValue, setEditingValue] = useState('');
```

**Handler Functions:**
```tsx
const startRename = (sessionId: string, currentSummary: string) => {
  setEditingSessionId(sessionId);
  setEditingValue(currentSummary || 'New session');
};

const saveRename = async (workspaceId: string, sessionId: string) => {
  const trimmed = editingValue.trim();
  if (trimmed) {
    const workspace = workspaces[workspaceId];
    if (workspace) {
      await request('session.config.setSummary', {
        cwd: workspace.worktreePath,
        sessionId,
        summary: trimmed,
      });
      updateSession(workspaceId, sessionId, { summary: trimmed });
    }
  }
  setEditingSessionId(null);
};

const cancelRename = () => {
  setEditingSessionId(null);
};
```

**Session Item Structure:**
```tsx
<ContextMenu>
  <ContextMenuTrigger onClick={selectSession} ...>
    {isEditing ? (
      <input 
        value={editingValue}
        onBlur={saveRename}
        onKeyDown={handleKeyDown} // Enter saves, Escape cancels
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    ) : (
      <span>{displaySummary}</span>
    )}
  </ContextMenuTrigger>
  <ContextMenuPopup>
    <ContextMenuItem onClick={startRename}>Rename</ContextMenuItem>
  </ContextMenuPopup>
</ContextMenu>
```

### Interaction Flow
1. User right-clicks session item
2. Context menu appears at cursor position
3. User clicks "Rename"
4. Session text becomes an input field, text is selected
5. User types new name
6. User presses Enter (or clicks elsewhere)
7. Backend API called to persist, local state updated
8. Input reverts to text display

### Edge Cases Handled
- Empty input: Don't save empty string, revert to original
- Click outside (blur): Save current value
- Escape key: Cancel without saving
- Click on input: Stops propagation to prevent session selection
