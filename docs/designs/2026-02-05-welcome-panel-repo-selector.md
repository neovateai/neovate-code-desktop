# Welcome Panel with Repo Selector

**Date:** 2026-02-05

## Context

The `WorkspacePanel.tsx` component had an inline empty state when no messages existed:

```tsx
<div className="text-center mt-8" style={{ color: '#999' }}>
  No messages yet. Start a conversation!
</div>
```

This needed to be extracted into a reusable component with a more polished design including an icon and a repo/workspace selector dropdown.

## Discussion

**Key Questions:**
1. Should the repo selector allow switching workspaces or just display the current one?
   - Answer: Switch workspaces (full functionality)

2. What should the new empty state component be named?
   - Answer: `WelcomePanel`

**Alternatives Considered:**
- `ChatEmptyState` - too focused on chat context
- `EmptyConversation` - describes state but less welcoming

## Approach

Create two separate components following single-responsibility:
1. `RepoSelector` - standalone workspace switching dropdown
2. `WelcomePanel` - combines the icon, welcome text, and RepoSelector

This allows `RepoSelector` to be reused elsewhere if needed.

## Architecture

**New Components:**

### `src/renderer/components/RepoSelector.tsx`
- Uses existing `Select` UI primitives from `./ui/select`
- Reads `workspaces`, `selectedWorkspaceId` from Zustand store
- On selection change, calls `selectRepo()` and `selectWorkspace()` to switch context
- Displays branch name and folder name for each workspace option

### `src/renderer/components/WelcomePanel.tsx`
- Displays `MessageCircle` icon from lucide-react
- Shows "No messages yet. Start a conversation!" text
- Includes `RepoSelector` component below the text
- Centered layout with appropriate spacing

**Changes to `WorkspacePanel.tsx`:**
- Import `WelcomePanel`
- Replace inline empty state div with `<WelcomePanel />`

**Data Flow:**
```
WelcomePanel
  └── RepoSelector
        ├── reads: workspaces, selectedWorkspaceId (store)
        └── writes: selectRepo(), selectWorkspace() (store actions)
```
