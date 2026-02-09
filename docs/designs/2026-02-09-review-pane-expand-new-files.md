# Review Pane: Expand New Files by Default

**Date:** 2026-02-09

## Context
When viewing file diffs in the ReviewPane, newly fetched file changes should be expanded by default for better visibility and user experience. Currently, new files are only expanded if no items were previously open.

## Discussion
The current implementation in `ReviewPane.tsx` only expands all files when `openItems` is empty:

```typescript
setOpenItems((prev) => {
  if (prev.length === 0) {
    return newDiffs.map((d: FileDiff) => d.path);
  }
  return prev;
});
```

This means when diffs are re-fetched (e.g., after new messages), any new files added to the diff list remain collapsed, requiring manual expansion.

## Approach
Always expand all fetched files by default, ensuring users immediately see all file changes without manual interaction.

## Architecture
Modify the `setOpenItems` call in the `fetchDiffs` effect to always set all diff paths as open:

```typescript
setOpenItems(newDiffs.map((d: FileDiff) => d.path));
```

This simple change ensures every fetch results in all files being expanded, providing consistent visibility of all changes.
