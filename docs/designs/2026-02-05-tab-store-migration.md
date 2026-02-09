# Tab Store Migration

**Date:** 2026-02-05

## Context

Current ContentPanel Tab management is component-level (`useContentTabs` hook + React Context), making it impossible to operate Tabs from other components or plugins. We need to migrate Tab state to a global Zustand store so any component can open/close/operate Tabs (Terminal, Browser, Editor).

Goals:
- Any component can operate Tabs via store
- Existing `useContentTabs` hook maintains API compatibility
- Tab persistence works correctly

## Discussion

### Design Evolution

We considered multiple approaches:

1. **Service layer wrapper** - `app.workbench.contentPanel.openTab()`
   - Pros: Unified entry point, VS Code style
   - Cons: Extra abstraction layer, Service is just a thin Store wrapper

2. **Per-type modules** - `app.workbench.terminal.create()`
   - Pros: Type-safe, function-oriented
   - Cons: Complex, requires Wrapper objects and Instance Cache

3. **Use Store directly** ✅
   - Pros: Simplest, no extra abstraction, Store is already globally accessible
   - Cons: None (YAGNI)

### Final Decision

Chose **Option 3** because:
- Simplest approach, no extra abstraction
- Store is already globally accessible
- Callers just need `useStore()` or `useStore.getState()`
- Service layer would just proxy Store, adding no value

### Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| State location | UISlice.contentPanelTabs | Namespaced, no new slice file |
| API layer | Use Store directly | Simplest, no extra abstraction |
| repoPath handling | Optional param, defaults to selectedRepoPath | Convenient |
| Error handling | console.warn + return early | Non-destructive, debuggable |
| Selector stability | EMPTY_TABS constant | Avoid re-renders |
| Init check | `repoPath in tabsByRepo` | Distinguish "not init" vs "empty tabs" |
| Persistence | Store's mechanism | Unified, no separate localStorage |

## Approach

Migrate Tab state to `UISlice.contentPanelTabs`, operate via namespaced store actions:

```typescript
// In components, use hook (recommended)
const { addTab, closeTab } = useContentTabs({ repoPath })
addTab({ type: 'terminal', name: 'Build', ptyId: null })

// Anywhere, use store directly
const { contentPanelTabs } = useStore.getState()
contentPanelTabs.open({ type: 'browser', name: 'Preview' })
contentPanelTabs.close('tab-123')
contentPanelTabs.activate('tab-456')
```

## Architecture

### UISlice.contentPanelTabs (namespaced)

```typescript
// src/renderer/store/slices/ui.ts
interface ContentPanelTabsState {
  tabsByRepo: Record<string, ContentTab[]>
  activeTabIdByRepo: Record<string, string | null>

  // Actions (all warn and return early if repoPath is invalid)
  open: (input: CreateTabInput, repoPath?: string) => ContentTab | null
  close: (tabId: string, repoPath?: string) => void
  activate: (tabId: string, repoPath?: string) => void
  update: (tabId: string, updates: Partial<ContentTab>, repoPath?: string) => void
  reorder: (fromIndex: number, toIndex: number, repoPath?: string) => void
  initForRepo: (repoPath: string, tabs: ContentTab[], activeTabId: string | null) => void
}

interface UISlice {
  // ... other existing state
  contentPanelTabs: ContentPanelTabsState
}
```

### CreateTabInput

Reuse existing type definition from `types.ts`:

```typescript
type CreateTabInput =
  | { type: 'terminal'; name: string; ptyId: string | null }
  | { type: 'browser'; name: string }
  | { type: 'editor'; name: string; filePath: string; isDirty: boolean }
  | { type: 'review'; name: string; reviewId: string; title: string }
```

### useContentTabs Migration

Convert to Zustand selector, preserving existing API:

```typescript
// Stable empty array to avoid re-renders
const EMPTY_TABS: ContentTab[] = []

export function useContentTabs({ repoPath, onTabClose }: UseContentTabsOptions) {
  // Read from store (namespaced)
  const tabs = useStore(state => state.contentPanelTabs.tabsByRepo[repoPath] ?? EMPTY_TABS)
  const activeTabId = useStore(state => state.contentPanelTabs.activeTabIdByRepo[repoPath])
  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  // Store actions
  const { open, close, activate, update, reorder, initForRepo } = useStore(state => state.contentPanelTabs)

  // Initialize default tabs if repo not in store
  useEffect(() => {
    const isInitialized = repoPath in useStore.getState().contentPanelTabs.tabsByRepo
    if (!isInitialized) {
      initForRepo(repoPath, [createDefaultTerminalTab(), createDefaultEditorTab()], null)
    }
  }, [repoPath])

  // No localStorage logic - persistence handled by Store's setupPersistence()

  return {
    tabs,
    activeTab,
    activeTabId,
    addTab: (input: CreateTabInput) => open(input, repoPath)?.id ?? '',
    closeTab: (tabId: string) => { onTabClose?.(tabs.find(t => t.id === tabId)!); close(tabId, repoPath) },
    setActiveTab: (tabId: string) => activate(tabId, repoPath),
    updateTab: (tabId: string, updates: Partial<ContentTab>) => update(tabId, updates, repoPath),
    reorderTabs: (from: number, to: number) => reorder(from, to, repoPath),
    getTabsByType: <T extends ContentTabType>(type: T) => tabs.filter((t): t is TabOfType<T> => t.type === type),
  }
}
```

### File Changes

| File | Operation | Description |
|------|-----------|-------------|
| `src/renderer/store/slices/ui.ts` | Modify | Rewrite contentPanelTabs with new structure |
| `src/renderer/components/ContentPanel/useContentTabs.ts` | Modify | Convert to selector, remove localStorage |
| `src/renderer/persistence.ts` | Modify | Update PersistedState for new tab structure |

## Persistence

Use Store's existing persistence mechanism (via `electron.saveStore()`):
- No separate localStorage for tabs
- Tab state persisted as part of Store's `PersistedState`
- Debounced save handled by `setupPersistence()`
- Hydration handled by `hydrateStore()`

This simplifies `useContentTabs` - no persistence logic needed.

## Not In Scope

Deferred to future iterations:

- Service layer wrapper (`app.workbench.contentPanel`)
- Type-specific APIs (`terminal.create()`, `browser.create()`)
- Singleton logic
- Feature APIs (Terminal's sendInput, Browser's navigate)
- Wrapper objects (Terminal/Browser instances)
- Event system (onDidReceiveData, etc.)

## References

- Current hook: `src/renderer/components/ContentPanel/useContentTabs.ts`
- UISlice: `src/renderer/store/slices/ui.ts`
- Tab types: `src/renderer/components/ContentPanel/types.ts`
- Persistence: `src/renderer/persistence.ts`
