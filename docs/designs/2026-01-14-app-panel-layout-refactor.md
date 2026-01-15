# App Panel Layout Refactor

**Date:** 2026-01-14

## Context

The current Neovate Code Desktop uses a three-panel layout with Electron's default title bar. The goal is to modernize the UI by:
- Removing Electron's default title bar for a cleaner look
- Adopting a multi-panel layout to display more content
- Creating a flexible tab system for terminals, files, and other content

The reference design is inspired by OpenCode's layout with rounded panels and a vertical toolbar.

## Discussion

### Layout Structure
Initially considered a four-panel layout, but evolved to five panels after clarifying that the file tree should be a separate context panel controlled by an activity bar, not a tab within the tabs panel.

### Window Frame
Decided on frameless window with macOS native traffic lights (red/yellow/green buttons) positioned in a custom title bar area. The title bar includes:
- Traffic lights (left)
- Sidebar toggle button
- Chat/conversation button
- Repo name, branch, and current task display

### Panel Visibility
- Tabs Panel: Shows when tabs exist, auto-hides when all tabs closed
- Context Panel: Toggle via activity bar icons (click to show, click again to hide)
- Default startup: Only Tasks, Chat, and Activity Bar visible

## Approach

Implement a five-panel layout with dynamic visibility:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●  [≡] [💬]  repo-name ↵ branch  /  ○ Task Name                             │
├──────────┬────────────────────┬─────────────────┬─────────────┬─────────────────┤
│          │                    │ Terminal  +     │             │                 │
│  Tasks   │                    ├─────────────────┤   Context   │  Activity Bar   │
│  ──────  │    Chat Area       │                 │   Panel     │   ───────────   │
│  + New   │                    │                 │             │   [Files]  ●    │
│          │                    │   Tab Content   │  Files /    │   [Search]      │
│  Today   │                    │   (Terminal /   │  Search /   │   [Git]         │
│  ○ Task  │                    │    Logs / ...)  │  Git        │                 │
│          │                    │                 │             │                 │
│          ├────────────────────┤                 │             │                 │
│          │ [Input Area]       │                 │             │                 │
└──────────┴────────────────────┴─────────────────┴─────────────┴─────────────────┘
```

Default startup (minimal):
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●  [≡] [💬]  repo-name ↵ branch  /  ○ Task Name                             │
├──────────┬──────────────────────────────────────────────────────┬───────────────┤
│          │                                                      │               │
│  Tasks   │                                                      │ Activity Bar  │
│  ──────  │                    Chat Area                         │   ─────────   │
│  + New   │                                                      │   [Files]     │
│          │                                                      │   [Search]    │
│  Today   │                                                      │   [Git]       │
│  ○ Task  │                                                      │               │
│          │                                                      │               │
│          ├──────────────────────────────────────────────────────┤               │
│          │ [Input Area]                                         │               │
└──────────┴──────────────────────────────────────────────────────┴───────────────┘
```

## Architecture

### Panel Configuration

| Panel | Min Width | Default Width | Visibility |
|-------|-----------|---------------|------------|
| Tasks | 214px | 214px | Default visible, toggle via title bar |
| Chat | 300px | flex-1 | Always visible |
| Tabs Panel | 300px | 300px | Visible when tabs exist |
| Context Panel | 300px | 300px | Toggle via activity bar |
| Activity Bar | ~48px | ~48px | Always visible |

### Electron Window Configuration

```typescript
{
  frame: false,
  titleBarStyle: 'hiddenInset',
  trafficLightPosition: { x: 12, y: 12 },
}
```

### Title Bar Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ● ● ●    [≡] [💬]    repo-name ↵ branch  /  ○ Task Name        │
└─────────────────────────────────────────────────────────────────┘
```

- Entire area: `-webkit-app-region: drag`
- Interactive buttons: `-webkit-app-region: no-drag`
- Height: 44px (`h-11`)

### Activity Bar Icons

Initial icons:
- Files (file tree)
- Git

Context Panel displays content based on selected activity bar icon.

### Visual Style

- Reuse existing shadcn/ui CSS variables (no new variables)
- Rounded panels (`rounded-xl`)
- Solid backgrounds (no gradients)
- Support light and dark themes

### Files to Modify/Create

**Main Process:**
- `src/main/main.ts` - BrowserWindow configuration (Modified)

**Renderer - Layout Components:**
- `src/renderer/components/layout/title-bar.tsx` - Custom title bar with traffic lights (New)
- `src/renderer/components/layout/activity-bar.tsx` - Activity bar with panel icons (New)
- `src/renderer/components/layout/AppLayout.tsx` - Five-panel layout structure (Modified)
- `src/renderer/components/layout/index.ts` - Layout exports (Modified)

**Renderer - Secondary Sidebar (Context Panel):**
- `src/renderer/components/secondary-sidebar/index.tsx` - Secondary sidebar container (New)
- `src/renderer/components/secondary-sidebar/file-tree.tsx` - File explorer panel (New)
- `src/renderer/components/secondary-sidebar/git-panel.tsx` - Git status panel (New)

**Renderer - State Management:**
- `src/renderer/store/app/store.ts` - Zustand app store (New)
- `src/renderer/store/app/slices/ui.ts` - UI state slice for panel visibility (New)
- `src/renderer/store/app/slices/index.ts` - Slice exports (New)
- `src/renderer/store/app/selectors.ts` - State selectors (New)
- `src/renderer/store/app/index.ts` - Store exports (New)
- `src/renderer/store/index.ts` - Root store exports (Modified)

**Renderer - Other:**
- `src/renderer/App.tsx` - Root app integration (Modified)
- `src/renderer/components/RepoSidebar.tsx` - Tasks panel updates (Modified)
- `src/renderer/components/WorkspacePanel.tsx` - Chat panel updates (Modified)
- `src/renderer/components/ui/button.tsx` - Button variant updates (Modified)
- `src/renderer/components/ui/input.tsx` - Input styling updates (Modified)

**Dependencies:**
- `package.json` - Added lucide-react for icons (Modified)
