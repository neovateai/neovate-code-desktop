# Shared Layout Math Extraction & Panel Spacing Improvements

**Date:** 2026-02-06

## Context

The layout system had no standalone width-allocation algorithm. Drag constraints, toggle width assignment, and window overflow handling were all inline logic inside `AppLayoutProvider.tsx`, with each panel's `mousemove` handler hard-coding its own formula independently. As the number of panel combinations grew (3 panels × expanded/collapsed = 8 combinations), the inline calculations could not correctly handle constraint relationships across all states, resulting in:

- Dragging could squeeze the Chat Panel down to 0 width
- Toggling a panel open when the window was too narrow had no adaptive behavior
- Content Panel had a hard-coded `maxWidth: 480` that could not grow with the window

The core change is a **constraint-based width allocation algorithm** extracted as pure functions into `src/shared/layout/layoutMath.ts`, along with a refactor of the `AppLayoutProvider` computation logic to consume these shared functions.

## Discussion

### The Width Allocation Problem

The window has a fixed total width that must be distributed across multiple panels while satisfying:
1. Each expanded panel has `minWidth` and `maxWidth` constraints
2. The Chat Panel is flex-filled but has a `chatMin` lower bound
3. Handle count changes dynamically with expanded panel count (collapsed panels have no handle)
4. Toggling a panel may cause total demand to exceed window width, requiring graceful degradation

This is essentially a **1D constraint satisfaction problem**: allocate widths for N segments within a fixed total, where each segment has [min, max] bounds.

### Previous Approach (Problems)

```typescript
// Each panel hard-coded its own mousemove calculation
if (resizing === 'contentPanel') {
  const availableWidth = window.innerWidth - ACTIVITY_BAR_WIDTH - primaryWidth - secondaryWidth - CHAT_PANEL_MIN_SIZE;
  const dynamicMax = Math.min(maxWidth, availableWidth);  // maxWidth was hard-coded 480
  // ...
}
```

Issues:
- Each panel's formula was written independently, easy to miss constraints from other panels
- `maxWidth: 480` was a hard cap — could not utilize space even on large windows
- No dynamic handle count calculation (collapsed panels produce no handle, but the formulas ignored this)
- Toggle simply flipped `visible: !visible` without validating width legality
- `PanelState.visible` was semantically ambiguous — reads as "is visible in viewport" but actually meant "not collapsed"

### New Algorithm Design

Model the width equation as:

```
windowWidth = fixed(handles) + primaryWidth + chatWidth + contentWidth + secondaryWidth
```

Where `fixed(handles) = activityBar + edge + handleCount × handleWidth`, and `handleCount` is dynamically computed from the expanded/collapsed state.

**Key constraints**:
- `chatWidth >= chatMin` (Chat is flex-filled, only has a lower bound)
- Each expanded panel: `width ∈ [minWidth, dynamicMax]`
- `dynamicMax` is not hard-coded, but **derived from total width**: `windowWidth - fixed - other panels' actual widths - chatMin`

## Approach

### Width Space Model

```
┌─────────────────── windowWidth ────────────────────┐
│ edge │ primary │ h │ chat(flex) │ h │ content │ h │ secondary │ activityBar │
└────────────────────────────────────────────────────┘

fixed = activityBar + edge + handleCount × handleWidth
flexible = primaryWidth + chatWidth + contentWidth + secondaryWidth
windowWidth = fixed + flexible
```

- `handleCount` = number of expanded panels (collapsed panels produce no handle on either side)
- Chat has no independent `width` state — it is `flex: 1` filling remaining space
- Chat's actual width = `windowWidth - fixed - primary - content - secondary`

### Dynamic Max Width

Each panel's maximum during drag is not hard-coded but computed as **the remaining space after pushing all other panels to their minimums**:

```typescript
dynamicMaxForContent   = windowWidth - fixed - primaryWidth   - chatMin - secondaryWidth
dynamicMaxForPrimary   = windowWidth - fixed - chatMin        - contentWidth - secondaryWidth
dynamicMaxForSecondary = windowWidth - fixed - primaryWidth   - chatMin - contentWidth
```

Content Panel's `hardMax` is set to `Infinity`, making it purely constrained by `dynamicMax`. This means the larger the window, the more space Content Panel can use.

### Mouse Position to Panel Width Mapping

The three panels have different positions, so the `clientX` to `width` mapping differs:

```
Primary:   width = clientX - edge
Content:   width = rightBoundary - clientX        (measured right-to-left)
Secondary: width = windowWidth - clientX - activityBar  (measured from right edge)
```

Each mapping result is clamped to `[minWidth, min(hardMax, dynamicMax)]`.

### Overflow Degradation Algorithm (fitLayoutToWindow)

When toggling a panel open causes total demand to exceed window width, panels are shrunk by priority:

```
1. Shrink secondarySidebar first (down to secondaryMin)
2. Then shrink contentPanel (down to contentMin)
3. primarySidebar and chatMin are never shrunk (guaranteed floor)
```

```typescript
overflow = requiredCurrentWidth - windowWidth
shrinkSecondary = min(secondary.width - secondaryMin, overflow)
overflow -= shrinkSecondary
shrinkContent = min(content.width - contentMin, overflow)
```

This is a greedy strategy: less important panels yield first to preserve the primary panels (Primary Sidebar + Chat).

### Toggle Width Decision

When toggling a panel open, the restored width cannot blindly use the `stored width` (it may exceed current window constraints):

```typescript
applyToggle:
  1. collapsed → !collapsed
  2. if collapsing (closing) → return immediately
  3. if expanding (opening) →
     a. Content Panel first open (no stored layout) → 50/50 split
     b. otherwise → clamp(storedWidth, minWidth, dynamicMax)
```

**50/50 split for first Content Panel open**:

```typescript
available = windowWidth - fixed - primaryWidth
half = available / 2
contentWidth = max(contentMin, min(half, available - chatMin))
```

Ensures Chat and Content each get half the available space, while neither drops below its minimum.

### Window Auto-Resize (IPC)

When the renderer computes `requiredMinWidth > window.innerWidth`, it requests the main process to expand the window via IPC:

```typescript
// renderer: after toggle
const requiredMin = getRequiredMinWidth(nextLayout, constants);
if (window.innerWidth < requiredMin) {
  void ipcMainCaller.window.ensureWidth({ minWidth: requiredMin });
}

// main: caps at physical display width
const maxWidth = display.workAreaSize.width;
const target = min(minWidth, maxWidth);  // never exceed screen
win.setMinimumSize(target, minH);
if (curW < target) win.setSize(target, curH);
```

### Provider Refactor

The `AppLayoutProvider` was refactored to consume the shared pure functions instead of inline calculations:

- `toggle()` now calls `applyToggle()` → `getRequiredMinWidth()` → `fitLayoutToWindow()` as a pipeline
- `mousemove` handler replaced with a single `getResizeWidthFromMouse()` dispatch that routes to the correct per-panel function
- `loadLayout()` delegates to `parseStoredLayout()` for validated deserialization
- Layout constants consolidated into a `LAYOUT_CONSTANTS` object passed to all pure functions

### Module Structure

```
src/shared/layout/
├── constants.ts      # Panel size constants and configuration
├── types.ts          # PanelId, PanelState, Layout
├── layoutMath.ts     # Core algorithms: constraint solving, drag mapping, toggle, overflow degradation
├── layoutState.ts    # Default layout generation, localStorage parse/validation
├── windowSizing.ts   # Window size computation (used by main process)
└── index.ts          # Barrel exports
```

### Constant Changes

| Constant | Old | New | Reason |
|----------|-----|-----|--------|
| `CHAT_PANEL_MIN_SIZE` | 300 | 320 | More breathing room for chat area |
| `primarySidebar.defaultWidth` | 220 | 300 | Wider default to fit more content |
| `primarySidebar.minWidth` | 180 | 250 | Prevent content truncation when narrow |
| `primarySidebar.maxWidth` | 320 | 600 | Allow wider range of adjustment |
| `secondarySidebar.maxWidth` | 480 | 600 | Same as above |
| `contentPanel.maxWidth` | 480 | Infinity | Constrained by dynamicMax, no hard cap |
| `defaultVisible` → `defaultCollapsed` | — | — | Inverted semantics, clearer intent |

## Architecture

### Spacing Model Change

**Before**: Primary Sidebar had `paddingLeft: PANEL_WINDOW_EDGE_SPACING` internally; Chat Panel had `marginLeft: PANEL_PANEL_SPACING / 2`. Spacing was split across both sides. Primary Sidebar content width required manually subtracting `PANEL_WINDOW_EDGE_SPACING + PANEL_PANEL_SPACING / 2`.

**After**: `AppLayoutRoot` sets `paddingLeft: PANEL_WINDOW_EDGE_SPACING` uniformly; `AppLayoutRightContainer` sets `paddingBottom: PANEL_WINDOW_EDGE_SPACING`. Inter-panel spacing is entirely owned by the `ResizeHandle` component's `width: PANEL_PANEL_SPACING`. Primary Sidebar content width equals `panel.width` directly — no manual subtraction needed.

### Unified ResizeHandle

Previously, Primary Sidebar used an absolutely positioned resize handle (`position: absolute; left: panel.width - 6`), while Content/Secondary used inline handles. These were two different implementations.

Now unified into a single `ResizeHandle` component shared by all panels:
- Fixed width of `PANEL_PANEL_SPACING` (5px), participates in flex layout as an inline element
- Hit area expanded via `absolute inset-y-0 -inset-x-1`
- Gradient highlight indicator on hover
- Returns `null` when the panel is collapsed (takes no space, produces no handle width in the equation)

### Full Toggle Flow

```
User clicks toggle
  → applyToggle() computes new layout (with width clamp / 50-50 split)
  → getRequiredMinWidth() computes minimum window width needed
  → if window too narrow → ipcMainCaller.window.ensureWidth() requests expansion
  → fitLayoutToWindow() overflow degradation (shrink secondary → shrink content)
  → ensureWidth() again to update window minimum size constraint
  → saveLayout() persists to localStorage
```

### Test Coverage

All algorithms are pure functions, 100% unit-testable:

`layoutMath.test.ts` (297 lines):
- Handle count and fixed width formula
- requiredMin / requiredCurrent width calculations
- fitLayoutToWindow overflow degradation strategy (shrink secondary then content)
- Dynamic max for all three panel directions
- Mouse-to-width mapping for all three panel directions
- applyToggle first-open 50/50 split + reopen clamp
- clampWidth edge case (returns min when max < min)

`layoutState.test.ts`: Default layout generation, invalid JSON fallback, out-of-range width clamping

`windowSizing.test.ts`: Window resize computation (below max / above max / already sufficient)
