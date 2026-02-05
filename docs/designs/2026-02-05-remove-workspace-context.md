# Remove WorkspaceContextType Refactor

## Summary

Remove the redundant `WorkspaceContext` layer from `WorkspacePanel.tsx` and have `WorkspacePanel.Messages` read state directly from the Zustand store.

## Motivation

- `WorkspaceContextType` and `useWorkspaceContext` are only used by `WorkspacePanel.Messages`
- The context simply passes through values already available in the Zustand store
- Removing this layer reduces indirection and simplifies the code

## Changes

### Remove from WorkspacePanel.tsx

1. Delete `WorkspaceContextType` interface (lines 35-46)
2. Delete `WorkspaceContext` creation (lines 48-50)
3. Delete `useWorkspaceContext` hook (lines 53-59)
4. Delete `contextValue` memo (lines 273-291)
5. Remove `<WorkspaceContext.Provider>` wrapper, keep children

### Update WorkspacePanel.Messages

Replace:
```tsx
const { messages, selectedSessionId } = useWorkspaceContext();
```

With:
```tsx
const selectedSessionId = useStore((state) => state.selectedSessionId);
const messagesMap = useStore((state) => state.messages);
const messages = useMemo(
  () => (selectedSessionId ? messagesMap[selectedSessionId] || [] : []),
  [selectedSessionId, messagesMap],
);
```

## Impact

- ~30 lines of boilerplate removed
- No functional changes
- No performance impact (Zustand already optimizes re-renders)
- Single internal consumer makes this low-risk
