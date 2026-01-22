# Content Tab Drag-to-Reorder

**Date:** 2026-01-22

## Context

The ContentPanel in Neovate Code Desktop displays Terminal, Editor, and Review tabs in a tab bar. Users needed the ability to reorder these tabs via drag-and-drop to organize their workflow according to preference. The existing tab system already supported adding, closing, and switching tabs, with persistence to localStorage.

## Discussion

### Drag Scope Options Explored

1. **Reorder within tab bar** - Drag tabs left/right to change their order
2. **Drag to split pane** - Drag a tab to create side-by-side panels
3. **Both reorder + split** - Support both behaviors

**Decision:** Reorder within tab bar only. Split pane functionality was deferred as YAGNI.

### Drag-and-Drop Library Options

1. **Native HTML5 DnD** - Zero dependencies, simpler but less polished animations
2. **dnd-kit** - Popular library with smooth animations (~15KB)
3. **react-beautiful-dnd** - Older, heavier (~45KB), being phased out

**Decision:** dnd-kit was chosen for its balance of polish, size, and active maintenance.

### Implementation Approaches

1. **Approach A: Minimal Integration** - Add dnd-kit only to ContentTabBar with a new reorderTabs action
2. **Approach B: Custom Drag Overlay** - Add floating ghost preview for polished UX
3. **Approach C: Abstracted DnD Hook** - Create reusable useSortableList hook

**Decision:** Approach A (Minimal Integration) was selected. Custom overlays and abstractions were deferred as YAGNI - no other drag-and-drop use cases were identified.

## Approach

The implementation adds drag-to-reorder capability with minimal changes:

- A new `reorderTabs(fromIndex, toIndex)` action in the existing `useContentTabs` hook
- dnd-kit integration in `ContentTabBar.tsx` using `DndContext` and `SortableContext`
- Each `ContentTabItem` becomes sortable via the `useSortable` hook
- Existing localStorage persistence automatically saves the new tab order

Key UX decisions:
- 5px activation distance prevents accidental drags when clicking
- 50% opacity on dragged tab provides visual feedback
- Keyboard support included for accessibility

## Architecture

### Dependencies Added

```
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities
```

### Files Modified

| File | Changes |
|------|---------|
| `useContentTabs.ts` | Added `reorderTabs(fromIndex, toIndex)` action |
| `ContentTabBar.tsx` | Wrapped tabs in DndContext/SortableContext, made ContentTabItem sortable |

### Data Flow

```
User drags tab
    ↓
DndContext onDragEnd fires
    ↓
Extract oldIndex, newIndex from active/over IDs
    ↓
Call reorderTabs(oldIndex, newIndex)
    ↓
State updates → tabs array reordered
    ↓
Existing persistence auto-saves new order
```

### State Management

The `reorderTabs` action uses standard array splice pattern:

```typescript
const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
  setState((prev) => {
    const newTabs = [...prev.tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    return { ...prev, tabs: newTabs };
  });
}, []);
```

### UI Integration

ContentTabBar configures sensors and handles drag end:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = tabs.findIndex((t) => t.id === active.id);
    const newIndex = tabs.findIndex((t) => t.id === over.id);
    reorderTabs(oldIndex, newIndex);
  }
};
```

ContentTabItem uses useSortable for drag behavior:

```typescript
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: tab.id });

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  // ... existing styles
};
```

### Behavior Summary

| Action | Result |
|--------|--------|
| Click tab | Selects tab (unchanged) |
| Drag tab 5+ pixels | Initiates drag mode |
| Drop on another tab | Reorders tabs, persists to localStorage |
| Keyboard (Tab + Space/Enter) | Accessible reordering |
