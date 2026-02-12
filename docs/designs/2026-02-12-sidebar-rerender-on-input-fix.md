# Sidebar Re-render on Input Fix

**Date:** 2026-02-12

## Context

When typing in the ChatInput component, the left sidebar (`RepoSidebar`) was visibly refreshing on every keystroke. This caused unnecessary UI jank and degraded the perceived performance of the application. The root cause was traced to Zustand store subscription patterns that caused overly broad reactivity, where components subscribed to the entire store instead of specific slices.

## Discussion

### Key Questions Investigated

1. **What connects the ChatInput and RepoSidebar?** Both components are siblings rendered by `App.tsx`. They don't share props, but they share the same Zustand store. The question was: which store subscription in the sidebar was responding to input changes?

2. **Which store state changes during typing?** The `inputBySession` slice updates via a debounced call from `useInputState` when the user types. This is the only store mutation triggered by typing.

3. **Why does changing `inputBySession` affect the sidebar?** The sidebar doesn't subscribe to `inputBySession` directly. However, `useRepoDelete()` — called inside `RepoSidebar` — used `useStore()` without a selector. In Zustand, calling `useStore()` without a selector subscribes the component to the **entire store**. Any state change (including `inputBySession`) triggers a re-render.

### Additional Issue: Debounce Bug in `useInputState`

During analysis, a secondary bug was discovered. `setValue` and `setCursorPosition` in `useInputState` shared the same `debounceRef`. Since `onChange` calls both sequentially on every keystroke, `setCursorPosition` always cancelled the pending `setValue` debounce timer. This meant the input **value was never synced back to the store** — only the cursor position was.

### Trade-offs Considered

- **Memoizing `RepoSidebar` with `memo()`**: Would prevent re-renders from parent prop changes, but not from internal store subscriptions. Since the problem was the `useStore()` call inside `useRepoDelete`, `memo()` alone would not fix it.
- **Using `useShallow` from Zustand**: Considered for `useInputState`'s session input selector. Rejected because the session input object gets a new reference on each `setSessionInput` call, so shallow comparison would still detect changes.
- **Multiple fine-grained selectors vs. single object selector**: For `useInputState`, individual selectors for every field (planMode, thinking, etc.) would be most precise but overly verbose. A single selector for the session input object was chosen as a pragmatic balance.

## Approach

Two targeted fixes were applied:

1. **`useRepoDelete.ts`**: Replace `useStore()` (no selector) with two individual selectors: `useStore((state) => state.deleteRepo)` and `useStore((state) => state.workspaces)`. This ensures the sidebar only re-renders when `deleteRepo` or `workspaces` actually change — neither of which changes during typing.

2. **`useInputState.ts`**: 
   - Replace `useStore()` with targeted selectors for actions (`setSessionInput`, `resetSessionInput`, `addToWorkspaceHistory`) and specific store slices (`inputBySession[sessionId]`, `historyByWorkspace[workspaceId]`).
   - Fix the debounce bug by introducing a `pendingChangesRef` that accumulates both value and cursor position changes. A single shared debounce timer flushes all pending changes together, ensuring both value and cursor position are saved to the store.

## Architecture

### Store Subscription Pattern (Anti-pattern vs. Correct)

```typescript
// ANTI-PATTERN: subscribes to entire store, re-renders on ANY change
const { deleteRepo, workspaces } = useStore();

// CORRECT: subscribes only to specific slices
const deleteRepo = useStore((state) => state.deleteRepo);
const workspaces = useStore((state) => state.workspaces);
```

### Batched Debounce Pattern for Input State

```
Keystroke -> setValue(newValue) -> setLocalValue (immediate)
                                -> pendingChangesRef.value = newValue
                                -> reset debounce timer

          -> setCursorPosition(pos) -> setLocalCursorPosition (immediate)
                                    -> pendingChangesRef.cursorPosition = pos
                                    -> reset debounce timer

After 150ms idle -> flushPendingChanges()
                 -> setSessionInput(sessionId, { value, cursorPosition })
                 -> pendingChangesRef = {}
```

This ensures:
- UI updates instantly via local React state (`setLocalValue`, `setLocalCursorPosition`)
- Store updates are batched and debounced (single update after 150ms idle)
- Both value and cursor position are included in the store update (fixes the previous bug where value was lost)

### Files with `useStore()` Without Selector (Audit)

The following files were identified as using `useStore()` without a selector. Only those affecting the left sidebar were fixed in this change:

| File | Used In | Fixed? |
|------|---------|--------|
| `hooks/useInputState.ts` | ChatInput | Yes |
| `components/Repo/useRepoDelete.ts` | RepoSidebar | Yes |
| `components/SecondarySidebar/FileTree.tsx` | Secondary sidebar | No (unrelated) |
| `components/ContentPanel/panes/EditorPane.tsx` | Content panel | No (unrelated) |
| `components/SecondarySidebar/useGit.ts` | Secondary sidebar | No (unrelated) |
| `components/SecondarySidebar/SearchPanel.tsx` | Secondary sidebar | No (unrelated) |
| `components/AddRepoMenu.tsx` | Add repo menu | No (unrelated) |
| `components/test/TestComponent.tsx` | Dev testing | No (unrelated) |

The remaining files should be fixed as follow-up work to prevent similar performance issues in other parts of the UI.
