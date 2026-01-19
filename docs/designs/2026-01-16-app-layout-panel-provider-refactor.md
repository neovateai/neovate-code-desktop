# App Layout Panel Provider Refactor

**Date:** 2026-01-16

## Context

The previous layout implementation used Zustand store state to control panel collapse/expand behavior, which created a disconnect between the actual panel state in `react-resizable-panels` and the application's understanding of that state. This led to synchronization issues and complex useEffect hooks to keep states aligned.

## Discussion

### Problems with Previous Approach
1. **State duplication**: Panel collapsed states were stored both in Zustand (`primarySidebarCollapsed`, `secondarySidebarCollapsed`, `terminalPanelCollapsed`) and implicitly in the `react-resizable-panels` library
2. **Sync issues**: Required `useEffect` hooks to synchronize Zustand state changes with panel imperative handles
3. **Complex persistence**: Needed to persist multiple boolean flags and pixel sizes separately from the library's built-in layout persistence

### Key Decisions
1. **Use library's native persistence**: Leverage `react-resizable-panels`'s `useDefaultLayout` hook which handles localStorage persistence automatically
2. **Context-based panel control**: Create `AppLayoutPanelProvider` to expose panel refs and layout state via React context
3. **Remove redundant state**: Eliminate `primarySidebarCollapsed`, `secondarySidebarCollapsed`, `secondarySidebarSize`, and `terminalPanelCollapsed` from Zustand
4. **Derive collapsed state from layout**: Use `layout[panelId] === 0` to determine if a panel is collapsed

## Approach

### New Architecture

```
AppLayoutPanelProvider (Context)
├── Provides: panelRefs, panels, layout, setLayout
└── Uses: usePanelCallbackRef() from react-resizable-panels

AppLayoutPanelGroup
├── Uses: useDefaultLayout() for localStorage persistence
└── Syncs layout changes to context

Panel Components (PrimarySidebar, ChatPanel, ContentPanel, SecondarySidebar)
├── Accept panelRef from context
└── Self-register via Panel component's panelRef prop
```

### Panel Control Flow
1. **Toggle sidebar**: Get panel handle from context → call `panel.collapse()` or `panel.expand()`
2. **Check collapsed state**: Read from `layout[panelId] === 0`
3. **Persistence**: Handled automatically by `useDefaultLayout` with `localStorage`

## Architecture

### New Files
- `src/renderer/components/layout/app-layout-provider.tsx` - Context provider with panel refs and layout state

### Modified Files

**AppLayout.tsx**
- Removed legacy exports (`AppLayoutSidebar`, `AppLayoutPrimaryPanel`, `AppLayoutSecondaryPanel`)
- Renamed panels: `AppLayoutTasksPanel` → `AppLayoutPrimarySidebar`, `AppLayoutTabsPanel` → `AppLayoutContentPanel`
- Moved `TitleBar` into `AppLayoutTitleBar` function (deleted separate TitleBar.tsx)
- Added `AppLayoutPanelGroup` that wraps panels with persistence

**TitleBar.tsx** (deleted)
- Functionality merged into `AppLayout.tsx` as `AppLayoutTitleBar`
- Now uses context for panel control instead of Zustand actions

**ActivityBar.tsx**
- Uses `useAppLayoutPanels()` context instead of Zustand state
- Derives collapsed state from `layout[panelId] === 0`

**ui-slice.ts**
- Removed: `primarySidebarCollapsed`, `secondarySidebarCollapsed`, `secondarySidebarSize`, `terminalPanelCollapsed`
- Removed: `togglePrimarySidebar`, `toggleSecondarySidebar`, `toggleTerminalPanel`, etc.
- Added: `ContentPanelTab` and `SecondarySidebarTab` types
- Added: `contentPanelTabs`, `contentPanelActiveTab` for future multi-tab support

**RepoSidebar.tsx**
- Removed `primarySidebarCollapsed` check (content now always renders, visibility controlled by panel)
- Removed `collapsed` prop from Footer component

**persistence.ts**
- Updated persisted state to match new UISlice shape
- Removed panel size/collapsed booleans

### CSS Additions
- Panel collapse/expand animation: `transition: flex-grow 50ms ease-out`
- Disable animation during drag: `[data-group]:has([data-separator="active"]) [data-panel] { transition: none }`

### Other Changes
- `main.ts`: Adjusted traffic light position (y: 12 → 14)
- Updated `react-resizable-panels` from 4.3.3 to 4.4.1
