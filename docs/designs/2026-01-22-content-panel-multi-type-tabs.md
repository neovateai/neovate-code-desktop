# Content Panel with Multi-Type Tabs

**Date:** 2026-01-22
**Status:** Implemented

## Context

The current `Terminal.tsx` component only supports terminal tabs. The goal is to refactor this into a generic `ContentPanel` system that can support multiple panel types (Terminal, Editor, Review, and future types) within a unified tab bar.

Key requirements identified:
- **Open-ended panel types** — system should easily extend to new panel types
- **Unified tab bar** — all panel types share a single tab bar
- **Per-repo persistence** — tab state persists when switching between repos
- **Dropdown menu** — single "+" button with dropdown to choose panel type

## Discussion

### Approaches Considered

**Approach A: Plugin Architecture**
- Registry/plugin pattern for panel renderers
- Most extensible but requires more upfront abstraction
- Tab-specific state must be managed per-type

**Approach B: Polymorphic Refactor**
- Refactor Terminal.tsx to use polymorphic Tab interface
- Minimal changes to existing code
- Risk of bloated context with type-specific helpers

**Approach C: Headless Hook + Composition** (Selected)
- Extract headless `useContentTabs` hook for tab CRUD and persistence
- Thin `ContentPanel` composes UI components
- Panel components stay focused on their specific rendering
- Maximum flexibility and testability

### Key Decisions

1. **Runtime instances stored separately** — XTerm/Monaco instances kept in ref-based map, not in serializable tab state
2. **Lazy initialization** — Panes create their runtime instances only when mounted and active
3. **Type-safe discriminated union** — `ContentTab = TerminalTab | EditorTab | ReviewTab`

## Approach

Use a headless hook pattern where `useContentTabs` manages all tab state and persistence logic, while UI components consume this via context. Each panel type (Terminal, Editor, Review) has its own pane component responsible for rendering and managing runtime instances.

The dropdown menu provides a single entry point for adding new tab types. Extending the system requires:
1. Add new type to the `ContentTab` discriminated union
2. Create a pane component for the type
3. Add entry to router switch and dropdown menu options

## Architecture

### Data Types

```typescript
// src/renderer/components/ContentPanel/types.ts

interface BaseTab {
  id: string;
  name: string;
  type: string;
}

interface TerminalTab extends BaseTab {
  type: 'terminal';
  ptyId: string | null;
}

interface EditorTab extends BaseTab {
  type: 'editor';
  filePath: string;
  isDirty: boolean;
}

interface ReviewTab extends BaseTab {
  type: 'review';
  reviewId: string;
  title: string;
}

type ContentTab = TerminalTab | EditorTab | ReviewTab;
type SerializableTab = Omit<ContentTab, 'xterm' | 'fitAddon'>;
```

### Headless Hook

```typescript
// src/renderer/hooks/useContentTabs.ts

interface UseContentTabsOptions {
  repoPath: string;
}

interface UseContentTabsReturn {
  tabs: ContentTab[];
  activeTabId: string | null;
  activeTab: ContentTab | null;
  addTab: (tab: Omit<ContentTab, 'id'>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<ContentTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  getTabsByType: <T extends ContentTab['type']>(type: T) => Extract<ContentTab, { type: T }>[];
}
```

Persistence:
- Key: `contentTabs:${repoPath}`
- Only serialize `SerializableTab[]`
- Debounced save on state change
- Restore on mount, save on unmount

### Component Structure

```
src/renderer/components/ContentPanel/
├── index.tsx                 # Main export, composition root
├── ContentPanelProvider.tsx  # Context wrapper
├── ContentTabBar.tsx         # Unified tab bar
├── ContentTabItem.tsx        # Single tab with icon
├── AddTabMenu.tsx            # Dropdown for adding tabs
├── panes/
│   ├── TerminalPane.tsx      # XTerm rendering
│   ├── EditorPane.tsx        # Monaco editor (future)
│   └── ReviewPane.tsx        # Review UI (future)
├── useRuntimeInstances.ts    # Ref-based instance map
└── types.ts                  # Type definitions
```

### Main Component

```tsx
// src/renderer/components/ContentPanel/index.tsx

interface ContentPanelProps {
  repoPath: string;
  hidden?: boolean;
}

export function ContentPanel({ repoPath, hidden }: ContentPanelProps) {
  const tabManager = useContentTabs({ repoPath });
  
  return (
    <ContentPanelProvider value={tabManager}>
      <div style={{ display: hidden ? 'none' : 'flex' }}>
        <ContentTabBar />
        <ContentPaneRouter />
      </div>
    </ContentPanelProvider>
  );
}

function ContentPaneRouter() {
  const { activeTab } = useContentPanelContext();
  
  if (!activeTab) return <EmptyState />;
  
  switch (activeTab.type) {
    case 'terminal': return <TerminalPane tab={activeTab} />;
    case 'editor':   return <EditorPane tab={activeTab} />;
    case 'review':   return <ReviewPane tab={activeTab} />;
    default:         return null;
  }
}
```

### Runtime Instance Management

```typescript
// src/renderer/components/ContentPanel/useRuntimeInstances.ts

interface RuntimeInstanceMap<T> {
  get: (tabId: string) => T | undefined;
  set: (tabId: string, instance: T) => void;
  delete: (tabId: string) => void;
  has: (tabId: string) => boolean;
}

function useRuntimeInstances<T>(): RuntimeInstanceMap<T> {
  const instancesRef = useRef(new Map<string, T>());
  // Returns stable getter/setter interface
}
```

Runtime instances (XTerm, Monaco) are:
- Stored in ref-based map, not React state
- Created lazily when pane becomes active
- Cleaned up when tab is closed

### App.tsx Integration

```tsx
// Replace Terminal with ContentPanel

<AppLayoutContentPanel>
  <div className="h-full flex flex-col">
    {visitedRepoPathsArray.map((repoPath) => (
      <ContentPanel
        key={repoPath}
        repoPath={repoPath}
        hidden={repoPath !== selectedRepoPath}
      />
    ))}
  </div>
</AppLayoutContentPanel>
```

### Migration Path

1. Create `ContentPanel/` directory with new structure
2. Extract `TerminalPane` from existing `Terminal.tsx`
3. Implement `useContentTabs` hook with persistence
4. Wire up `ContentPanel` in `App.tsx`
5. Delete old `Terminal.tsx` once verified
