# Session Delete with Confirmation

**Date:** 2026-01-27

## Context

The RepoSidebar component displays a list of sessions for each workspace. Users needed the ability to delete sessions from the context menu with proper confirmation to prevent accidental deletions. The existing codebase already had a pattern for repository deletion using AlertDialog, and a `sessions.remove` API was available in the backend.

## Discussion

### UX for Confirmation
Three approaches were considered:
1. **AlertDialog** - Modal dialog with Cancel/Delete buttons (matches existing repo delete pattern)
2. **Inline confirmation** - Replace menu item with 'Confirm Delete?' text
3. **Toast with undo** - Delete immediately, show toast with undo option

**Decision:** AlertDialog was chosen to maintain consistency with the existing repository deletion pattern.

### Post-Delete Behavior
When a deleted session was the currently selected session:
1. **Auto-select next** - Select the next most recent session in the same workspace
2. **Clear selection** - Show empty state / new chat prompt
3. **Create new session** - Automatically create a fresh session

**Decision:** Auto-select next session for smoother UX.

### Local-Only Sessions
Sessions with `messageCount === 0` are local-only "New Chat" sessions that haven't been persisted to the backend. These should be removed from frontend store only, without calling the API.

## Approach

1. Add "Delete" option to session context menu with red text styling
2. Show AlertDialog confirmation before deletion
3. Check if session is local-only (messageCount === 0):
   - If local-only: Remove from frontend store only
   - If persisted: Call `sessions.remove` API, then remove from store
4. If deleted session was selected, auto-select the next most recent session

## Architecture

### Components & State

**New State in RepoSidebar:**
```tsx
const [sessionAlertOpen, setSessionAlertOpen] = useState(false);
const [sessionToDelete, setSessionToDelete] = useState<{
  sessionId: string;
  workspaceId: string;
  summary: string;
} | null>(null);
```

### Store Action

**Added to `slices/entities.ts`:**
```tsx
removeSession: (workspaceId: string, sessionId: string) => {
  set((state) => ({
    sessions: {
      ...state.sessions,
      [workspaceId]: (state.sessions[workspaceId] || [])
        .filter((s) => s.sessionId !== sessionId),
    },
  }));
}
```

### Handler Functions

```tsx
const handleDeleteSessionClick = (
  session: { sessionId: string; summary: string; messageCount: number },
  workspaceId: string,
) => {
  setSessionToDelete({
    sessionId: session.sessionId,
    workspaceId,
    summary: session.summary || 'New Chat',
  });
  setSessionAlertOpen(true);
};

const handleConfirmDeleteSession = async () => {
  // ... validation

  // Check if local-only
  const session = (sessions[workspaceId] || []).find(
    (s) => s.sessionId === sessionId,
  );
  const isLocalOnly = !session || session.messageCount === 0;

  // Only call API if persisted
  if (!isLocalOnly) {
    await request('sessions.remove', { cwd, sessionId });
  }

  // Remove from local store
  removeSession(workspaceId, sessionId);

  // Auto-select next session if needed
  if (selectedSessionId === sessionId) {
    const remaining = sessions[workspaceId]
      .filter((s) => s.sessionId !== sessionId)
      .sort((a, b) => b.modified - a.modified);
    selectSession(remaining[0]?.sessionId ?? null);
  }
};
```

### Context Menu

```tsx
<ContextMenuPopup>
  <ContextMenuItem onClick={() => startRename(...)}>
    Rename
  </ContextMenuItem>
  <ContextMenuItem
    onClick={() => handleDeleteSessionClick(session, workspaceId)}
    className="text-red-500"
  >
    Delete
  </ContextMenuItem>
</ContextMenuPopup>
```

### AlertDialog

```tsx
<AlertDialog open={sessionAlertOpen} onOpenChange={setSessionAlertOpen}>
  <AlertDialogPopup>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Session?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "{sessionToDelete?.summary}". 
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogClose>
        <Button variant="outline">Cancel</Button>
      </AlertDialogClose>
      <Button variant="destructive" onClick={handleConfirmDeleteSession}>
        <DeleteIcon /> Delete
      </Button>
    </AlertDialogFooter>
  </AlertDialogPopup>
</AlertDialog>
```

### Files Changed

| File | Changes |
|------|---------|
| `src/renderer/store/slices/entities.ts` | Added `removeSession` action |
| `src/renderer/components/RepoSidebar.tsx` | Added delete state, handlers, context menu item, AlertDialog |
