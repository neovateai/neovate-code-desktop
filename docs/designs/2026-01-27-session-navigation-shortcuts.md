# Session Navigation Keyboard Shortcuts

**Date:** 2026-01-27

## Context

Add keyboard shortcuts `Cmd+Option+Up` and `Cmd+Option+Down` to navigate between sessions (previous/next) within the current workspace. This enables power users to quickly switch between chat sessions without using the mouse.

## Discussion

### Customizability
**Question:** Should these shortcuts be user-customizable in the Keybindings settings panel?  
**Decision:** Yes, customizable. Users can rebind these shortcuts in Settings > Keybindings, following the same pattern as `newChat` (Cmd+N).

### Implementation Approach
Three approaches were considered:

1. **Store-level Navigation Actions (Chosen):** Add `selectPrevSession()` and `selectNextSession()` actions directly to the Zustand store, then wire them to keybindings in `App.tsx`.
   - Pros: Encapsulates navigation logic in store, reusable, testable
   - Cons: Adds 2 new store actions

2. **Component-level Handler:** Handle all navigation logic inline in the `App.tsx` keydown handler.
   - Pros: Less store surface area
   - Cons: Logic mixed with UI, harder to test, duplicates sorting logic

3. **Custom Hook:** Extract a `useSessionNavigation()` hook.
   - Pros: Clean separation, hook-based composition
   - Cons: Extra abstraction layer, overkill for 2 simple actions

**Decision:** Approach 1 (Store actions) — follows existing patterns, keeps logic encapsulated and testable.

### Boundary Behavior
**Initial Implementation:** Wrap-around navigation (up from first → last, down from last → first).  
**Revised Requirement:** Stop at boundaries — no-op when already at first/last session.

### Session List Auto-Expansion
**Requirement:** When navigating to a session beyond the visible limit (default 5 sessions), automatically expand the session list so the selected session becomes visible.

**Implementation:** Check if target index >= `SESSION_LIMIT` (5) and if `expandedSessionGroups[workspaceId]` is false, then call `setSessionGroupExpanded(workspaceId, true)`.

## Approach

1. Add `prevSession` and `nextSession` to the `KeybindingAction` type with defaults `Cmd+Option+ArrowUp` and `Cmd+Option+ArrowDown`
2. Add store actions `selectPrevSession()` and `selectNextSession()` that:
   - Get sorted sessions (by `modified` descending, matching sidebar order)
   - Find current index and compute target index
   - Stop at boundaries (no wrap-around)
   - Auto-expand session list if target is beyond visible limit
   - Call `selectSession()` with target session ID
3. Wire keybindings in `App.tsx` keydown handler
4. Shortcuts are disabled when in settings or onboarding modal

## Architecture

### Files Modified

| File | Changes |
|------|---------|
| `src/renderer/lib/keybindings.ts` | Add `prevSession` and `nextSession` to `KeybindingAction` type, `KEYBINDING_LABELS`, and `DEFAULT_KEYBINDINGS` |
| `src/renderer/components/settings/KeybindingsPanel.tsx` | Add `prevSession` and `nextSession` to `KEYBINDING_ACTIONS` array |
| `src/renderer/store/slices/entities.ts` | Add `selectPrevSession()` and `selectNextSession()` actions; update `StoreWithSelections` interface to include `expandedSessionGroups` and `setSessionGroupExpanded` |
| `src/renderer/store/index.ts` | Add `setSessionGroupExpanded(workspaceId, expanded)` action |
| `src/renderer/App.tsx` | Extend keydown handler to dispatch `prevSession`/`nextSession` bindings |

### Store Action Logic

```typescript
selectPrevSession: () => {
  // Get sorted sessions (by modified descending)
  // Find current index
  // If at first session or no session selected, return (no-op)
  // If target index >= 5 and not expanded, auto-expand
  // Select previous session
}

selectNextSession: () => {
  // Get sorted sessions (by modified descending)
  // Find current index
  // If at last session, return (no-op)
  // If no session selected, select first
  // If target index >= 5 and not expanded, auto-expand
  // Select next session
}
```

### Keyboard Handler Pattern

```typescript
// In App.tsx useEffect
if (matchesBinding(e, keybindings.prevSession)) {
  e.preventDefault();
  selectPrevSession();
  return;
}

if (matchesBinding(e, keybindings.nextSession)) {
  e.preventDefault();
  selectNextSession();
  return;
}
```

### Behavior Summary

- `Cmd+Option+↑` — Navigate to previous session (stops at first)
- `Cmd+Option+↓` — Navigate to next session (stops at last)
- Sessions ordered by most recently modified (same as sidebar display)
- User-customizable in Settings > Keybindings
- Disabled when in settings or onboarding modal
- Auto-expands session list when navigating beyond visible 5-session limit
