# Workbench Layout Refactor

**Date:** 2026-02-04

## Context

The current UI layout uses a single title bar spanning the full width with all panels managed in one `react-resizable-panels` group. This structure doesn't support the desired visual hierarchy where the Primary Sidebar should span the full window height independently, and title bars should have content-based widths rather than being tied to panel widths below.

The refactor prepares the layout for future feature additions while achieving a cleaner visual separation between the sidebar and main content areas.

## Discussion

### Approaches Considered

1. **Single PanelGroup with nested title bars** - Title bars nested inside each panel. Rejected because SecondaryTitleBar needs to span ContentPanel + SecondarySidebar, which isn't possible when title bars are inside individual panels.

2. **CSS Grid Layout** - Pixel-perfect control over all regions. Rejected because it requires rebuilding all resize functionality from scratch, losing the smooth interactions provided by `react-resizable-panels`.

3. **Nested layout structure** (chosen) - Primary Sidebar separate from the main panel group. Title bars in their own row above panels. Keeps `react-resizable-panels` for the main content area while allowing independent layout for the sidebar.

### Key Questions Resolved

- **Traffic lights location**: Inside Primary Sidebar header, with sidebar toggle button. When sidebar collapsed, traffic lights section remains in title row only (no space below).
- **Title bar widths**: Content-based (determined by buttons/controls), not tied to panel widths below.
- **Control placement**: Primary sidebar toggle in traffic lights section; secondary sidebar toggles (Files/Git) in top-right corner above Activity Bar.
- **StatusBar scope**: Only spans under panels area, NOT under Primary Sidebar.

## Approach

Restructure the layout into a nested flex container hierarchy:

```
App (root, flex-row)
├── PrimarySidebar (flex-col, full height)
│   ├── TrafficLightsSection (traffic lights + sidebar toggle)
│   └── Sessions content
└── [right container - flex-col, flex-1]
    ├── [title area - flex-row]
    │   ├── PrimaryTitleBar (content-width: project selector)
    │   ├── SecondaryTitleBar (flex-1: settings button + drag region)
    │   └── SecondarySidebarToggles (Files/Git toggle buttons)
    ├── [panel area - react-resizable-panels, flex-row, flex-1]
    │   ├── ChatPanel
    │   ├── ContentPanel (with ContentPanelTabs header)
    │   ├── SecondarySidebar
    │   └── ActivityBar
    └── StatusBar
```

When Primary Sidebar is collapsed, the TrafficLightsSection moves to the title row (no sidebar space below), and ChatPanel expands to full width.

## Architecture

### Target Layout (Expanded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌───────────┬───────────────────┬──────────────────────────────┬──────────┐ │
│ │  ○ ○ ○    │                   │                              │  [F][G]  │ │
│ │  [≡]      │  [Project ▼]      │              [⚙]             │  toggle  │ │
│ │ traffic   │  PrimaryTitleBar  │       SecondaryTitleBar      │  buttons │ │
│ │ lights +  │  (project select) │       (settings)             │          │ │
│ │ sidebar   │                   │                              │          │ │
│ │ toggle    │                   │                              │          │ │
│ ├───────────┼───────────────────┼────────────────┬─────────────┼──────────┤ │
│ │           │                   │  ContentPanel  │             │   [F]    │ │
│ │           │                   │  Tabs          │             │   [G]    │ │
│ │  Primary  │                   ├────────────────┤  Secondary  │   ---    │ │
│ │  Sidebar  │    ChatPanel      │                │  Sidebar    │   [P]    │ │
│ │           │                   │  ContentPanel  │             │ Activity │ │
│ │           │                   │                │             │   Bar    │ │
│ │           │                   │                │             │          │ │
│ │           ├───────────────────┴────────────────┴─────────────┴──────────┤ │
│ │           │                          StatusBar                          │ │
│ └───────────┴─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Target Layout (Collapsed)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┬─────────────────────┬────────────────────────────┬──────────┐ │
│ │ ○ ○ ○   │                     │                            │  [F][G]  │ │
│ │   [≡]   │  [Project ▼]        │              [⚙]           │          │ │
│ ├─────────┴─────────────────────┼──────────────┬─────────────┼──────────┤ │
│ │                               │ ContentPanel │             │   [F]    │ │
│ │                               │ Tabs         │             │   [G]    │ │
│ │         ChatPanel             ├──────────────┤  Secondary  │   ---    │ │
│ │     (expands full width)      │              │  Sidebar    │   [P]    │ │
│ │                               │ ContentPanel │             │ Activity │ │
│ │                               │              │             │   Bar    │ │
│ ├───────────────────────────────┴──────────────┴─────────────┴──────────┤ │
│ │                              StatusBar                                 │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Content | Behavior |
|-----------|---------|----------|
| TrafficLightsSection | macOS traffic lights + sidebar toggle [≡] | Part of PrimarySidebar when expanded; moves to title row when collapsed |
| PrimarySidebar | Sessions/repos list | Full height, resizable width |
| PrimaryTitleBar | Project selector dropdown | Content-based width, drag region |
| SecondaryTitleBar | Settings button [⚙] | flex-1, drag region fills remaining space |
| SecondarySidebarToggles | Files [F] + Git [G] buttons | Fixed width, toggles secondary sidebar view |
| ChatPanel | Main chat interface | Resizable, expands when sidebar collapsed |
| ContentPanel | Terminal/editor tabs + content | Resizable, collapsible |
| SecondarySidebar | Files/Git panels | Resizable, collapsible |
| ActivityBar | Files, Git, Panels toggle icons | Fixed width |
| StatusBar | Empty placeholder | Fixed height, spans panel area only |

### Open Questions

- Primary Sidebar resize mechanism (CSS resize vs separate handle)
- Title bar heights (match current h-11?)
- SecondarySidebarToggles as part of SecondaryTitleBar or separate component
