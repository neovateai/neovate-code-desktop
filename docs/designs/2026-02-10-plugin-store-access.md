# Plugin Store Access via RendererApp

**Date:** 2026-02-10

## Context

Plugin components (Sidebar Panel and Content Panel) need access to the current repository path information (`repoPath` and `worktreePath`) in order to:

1. Call backend APIs that require a `cwd` parameter
2. Display repository information in the UI
3. Adjust plugin behavior based on the current repository context

Currently, plugin components only receive `app: RendererApp` as a prop. Repository and workspace information lives in the Zustand store (`selectedRepoPath`, `workspaces[id].worktreePath`), but plugins have no official API to access it. Built-in components (FileTree, GitPanel, SearchPanel) directly import `useStore`, which is not appropriate for plugins.

## Discussion

Four approaches were evaluated:

| Approach | Verdict | Reason |
|----------|---------|--------|
| **A: Add fields to Props** | Rejected | Props would bloat as more context fields are needed over time |
| **B: Custom hooks on RendererApp** | Rejected | Mounting React hooks on a class instance is unnatural |
| **C: Plugins directly import store** | Rejected | Hard-couples plugins to internal module paths |
| **D: Plugin Context + Provider** | Rejected | Premature abstraction — no third-party plugins exist yet, YAGNI |

A fifth approach emerged: expose the `useStore` reference on the `RendererApp` instance. This is a pragmatic middle ground — plugins access the store through the `app` prop they already receive, without importing internal modules or introducing new abstractions.

Key trade-off acknowledged: a React hook as a property on a class instance is slightly unconventional, but the `use` prefix signals hook calling rules, and all current plugins are first-party.

## Approach

Expose `useStore` as a property on `RendererApp`. Plugin components access it via `app.useStore(selector)`.

This is consistent with the existing `beforeRender` hook which already receives `{ store: typeof useStore }` during initialization. The same store reference is now available at component render time through the `app` prop.

## Architecture

### Change surface

1. **`RendererApp`** — Add a `useStore` property initialized in the constructor
2. **Plugin component types** — No changes needed (`app` is already in `SidebarPanelProps` and `ContentPanelProps`)
3. **Plugin rendering** — No changes needed (no new Provider or Context)

### Usage in plugin components

```tsx
function MySidebar({ app }: SidebarPanelProps) {
  const repoPath = app.useStore((s) => s.selectedRepoPath);
  const workspace = app.useStore((s) =>
    s.selectedWorkspaceId ? s.workspaces[s.selectedWorkspaceId] : null
  );
  const cwd = workspace?.worktreePath;
}
```

### Future evolution

If third-party plugins or sandboxing are needed later, a Context/Provider layer can be added on top of this without breaking existing plugin code — `app.useStore` would simply point to a scoped store proxy instead of the global store.
