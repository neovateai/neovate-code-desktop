# Repo Title Hover Delete Button

## Overview

Add a delete button that appears on hover for repo titles in the sidebar accordion.

## Scope

File: `src/renderer/components/RepoSidebar.tsx`

## Implementation

### Changes to AccordionTrigger (around line 355-366)

```tsx
<AccordionTrigger className="px-3 py-2 group w-full max-w-full">
  <div className="flex items-center gap-2 w-full min-w-0">
    <HugeiconsIcon icon={FolderIcon} size={18} strokeWidth={1.5} className="flex-shrink-0" />
    <div className="font-medium text-sm truncate flex-1">{repo.name}</div>
    <button
      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteRepoClick(repo);
      }}
    >
      <Trash2 size={14} strokeWidth={1.5} />
    </button>
  </div>
</AccordionTrigger>
```

### Wire up useRepoDelete

The `useRepoDelete` hook is already imported but needs `handleDeleteRepoClick` exposed:

```tsx
const {
  deleteDialogOpen: repoDeleteDialogOpen,
  repoToDelete: repoToDeleteInfo,
  handleDeleteRepoClick,  // ADD THIS
  handleConfirmDelete: handleRepoConfirmDelete,
  handleCancelDelete: handleRepoCancelDelete,
} = useRepoDelete();
```

## Behavior

- **Default state:** Delete icon hidden
- **Row hover:** Delete icon appears (opacity transition)
- **Icon hover:** Red background tint and red icon color
- **Click:** Opens existing `RepoDeleteDialog` confirmation modal
- **Click propagation:** Stopped to prevent accordion toggle

## Dependencies

- Reuses existing `useRepoDelete` hook
- Reuses existing `RepoDeleteDialog` component
- Uses `Trash2` icon from lucide-react (already imported)
