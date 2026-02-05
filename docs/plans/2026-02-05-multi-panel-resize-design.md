# Multi-Panel Resize Design (2026-02-05)

## Goals
- Make panel resize limits depend on visible panels and their minimum widths.
- Remove hard max for `contentPanel` and `chat` (chat is flex, content max is dynamic).
- Keep `primarySidebar` and `secondarySidebar` with explicit min/max.
- When content is opened for the first time (no saved layout), split available space 50/50 with chat.
- Move the left window edge spacing to an outer layout layer to simplify calculations.

## Constraints
- `primarySidebar`: min 250, max 600, default 300.
- `secondarySidebar`: min 250, max 600, default 300.
- `contentPanel`: min 300, no hard max (dynamic max only).
- `chat`: min 240, no hard max (flex remainder).
- `PANEL_WINDOW_EDGE_SPACING` stays at 8 and is always applied.
- Resize handles count as fixed width: each handle = `PANEL_PANEL_SPACING` (5px).

## Layout Change
- Move `PANEL_WINDOW_EDGE_SPACING` to `AppLayoutRoot` as a fixed left padding.
- Remove left padding from `AppLayoutPrimarySidebar` container.
- Keep top/bottom padding on the primary card as-is.
- Update primary inner width to match `panel.width` (no subtraction).

## Handle Count
Handles are rendered only for visible resizable panels.
Handle count = (primary visible) + (content visible) + (secondary visible).

## Dynamic Max Rule (Simple Form)
When dragging a panel, its max width is:
`max = windowWidth - fixed - otherMins`.

Where:
- `fixed = ACTIVITY_BAR_WIDTH + PANEL_WINDOW_EDGE_SPACING + (handleCount * PANEL_PANEL_SPACING)`
- `otherMins = chatMin + sum(minWidth of other visible panels)`
- If primary is visible and not the active panel, use its current width, not min.

## Panel-Specific Calculations
Primary resize:
- Reserve: chatMin + (contentMin if visible) + (secondaryMin if visible).
- Clamp to min/max and dynamic max.
- Use `e.clientX - PANEL_WINDOW_EDGE_SPACING` to account for outer padding.

Content resize:
- Reserve: chatMin + (secondaryMin if visible) + (primaryWidth if visible).
- Dynamic max only (no hard max).
- Width calculated by `rightBoundary - e.clientX`, then clamped.

Secondary resize:
- Reserve: chatMin + (contentMin if visible) + (primaryWidth if visible).
- Clamp to min/max and dynamic max.
- Width calculated by `window.innerWidth - e.clientX - ACTIVITY_BAR_WIDTH`, then clamped.

## First Open Split Rule
If no saved layout exists and the user opens `contentPanel`:
- Compute available width using the same dynamic rule.
- Set `contentWidth = clamp(available / 2, contentMin, available - chatMin)`.
- Persist layout after applying the width.

## Persistence
- Any resize or toggle saves layout immediately.
- The first-open split only runs when no saved layout exists.

## Edge Cases
- If the window is too narrow (available < chatMin + contentMin), clamping may overflow.
- This matches current behavior and avoids implicit panel collapse.
