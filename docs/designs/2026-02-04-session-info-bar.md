# Session Info Bar in TitleBar

## Overview

Add session information display to the TitleBar, showing the current session title, project name (clickable to open in Finder), and a dropdown menu with session actions.

## Components

### 1. SessionActionsMenu (New Component)

**Location:** `src/renderer/components/SessionActionsMenu.tsx`

Extracted dropdown menu component reused from RepoSidebar context menu logic.

**Props:**
```typescript
interface SessionActionsMenuProps {
  sessionId: string;
  workspaceId: string;
  session: SessionData;
  onRename?: () => void;
}
```

**Menu Items:**
- Rename
- Pin/Unpin
- Delete
- Separator
- Copy working directory
- Copy session ID

### 2. SessionInfoBar (Inline in TitleBar)

**Location:** Added directly in `src/renderer/components/layout/TitleBar.tsx`

**Display:**
- Session title (truncated, from `session.summary || 'New Chat'`)
- Project name (clickable, opens Finder via `window.electron.shell.showItemInFolder`)
- "..." button triggering SessionActionsMenu

**Visibility:** Only rendered when `selectedSessionId` exists.

## Layout

```
TitleBar
├── Traffic lights area (68px)
├── Sidebar toggle button
├── Project dropdown (when !multiProjectSupport)
├── SessionInfoBar (NEW)
│   ├── Session title
│   ├── "/" separator
│   ├── Project name (clickable)
│   └── MoreHorizontal button → SessionActionsMenu
├── Flex spacer
└── Right side buttons
```

## Data Flow

```typescript
const selectedSessionId = useStore(s => s.selectedSessionId);
const selectedWorkspaceId = useStore(s => s.selectedWorkspaceId);
const sessions = useStore(s => s.sessions);
const workspaces = useStore(s => s.workspaces);

const activeSession = sessions[selectedWorkspaceId]?.find(
  s => s.sessionId === selectedSessionId
);
const workspace = workspaces[selectedWorkspaceId];
const projectName = workspace?.repoPath.split('/').pop();
```

## Actions

### Open in Finder
```typescript
const handleOpenInFinder = () => {
  if (workspace?.worktreePath) {
    window.electron.shell.showItemInFolder(workspace.worktreePath);
  }
};
```

### Session Actions (via SessionActionsMenu)
- **Rename:** Triggers inline edit or modal
- **Pin/Unpin:** `togglePinSession(sessionId)`
- **Delete:** `removeSession(workspaceId, sessionId)` with confirmation
- **Copy working directory:** `navigator.clipboard.writeText(workspace.worktreePath)`
- **Copy session ID:** `navigator.clipboard.writeText(sessionId)`

## File Changes

| File | Change |
|------|--------|
| `src/renderer/components/SessionActionsMenu.tsx` | New extracted menu component |
| `src/renderer/components/layout/TitleBar.tsx` | Add SessionInfoBar section |
| `src/renderer/components/index.ts` | Export SessionActionsMenu |

## Dependencies

- `lucide-react`: MoreHorizontal, FolderOpen icons
- Existing UI components: Menu, MenuItem, MenuPopup, MenuTrigger, MenuSeparator
- Store selectors for session/workspace data
