# Shared Layout Core Design (2026-02-05)

## Goals
- Modularize panel drag/resize, collapse/expand, and window sizing logic into a shared core.
- Keep behavior identical while making the rules independently testable.
- Reduce renderer/main coupling by moving layout rules to `src/shared`.

## Non-Goals
- No UI/interaction changes.
- No changes to persistence keys or stored layout format.
- No new features beyond modularization and test moves/additions.

## Architecture
- Add `src/shared/layout/` as the single source of truth for layout rules.
- Move layout constants from `src/renderer/constants.ts` into `src/shared/layout/constants.ts`.
- Move layout types from `src/renderer/components/layout/layoutTypes.ts` into `src/shared/layout/types.ts`.
- Move `layoutMath.ts` into `src/shared/layout/layoutMath.ts` (unchanged behavior).
- Provide a unified entry point `src/shared/layout/index.ts` for constants/types/layoutMath/windowSizing.
- Move or re-export `computeEnsuredWindowWidth` under `src/shared/layout/windowSizing.ts`.

## Renderer Data Flow
- `AppLayoutProvider` remains responsible for IO and state (localStorage, IPC, React state).
- Pure calculations move to shared:
  - `getDefaultLayout(panelConfig)`
  - `parseStoredLayout(serialized, panelConfig)`
  - `applyToggle` / `fitLayoutToWindow` / `getRequiredMinWidth` / `getRequiredCurrentWidth`
  - `getResizeWidthFromMouse({ resizing, clientX, windowWidth, layout, constants, panelConfig })`
- Drag handlers only dispatch to shared helpers and update state.
- Toggle handlers compute next layout via shared helpers and persist via existing renderer logic.

## Main Process Data Flow
- `ensureWidth` keeps only Electron side effects.
- Window sizing calculations use shared `computeEnsuredWindowWidth`.

## Error Handling
- `parseStoredLayout` handles invalid JSON and schema mismatches, returning defaults.
- Renderer `saveLayout` keeps current try/catch behavior.
- All computation functions remain pure and deterministic.

## Testing
- Move `src/renderer/components/layout/layoutMath.test.ts` to `src/shared/layout/layoutMath.test.ts`.
- Add tests for shared helpers:
  - `getDefaultLayout`.
  - `parseStoredLayout` (valid, invalid, missing fields, out-of-range widths).
  - `getResizeWidthFromMouse` (primary/content/secondary branches).
- Move or re-point `src/shared/windowSizing.test.ts` to the new shared layout module.

## Migration Notes
- Renderer imports updated to `src/shared/layout` for constants/types/helpers.
- Main imports updated to `src/shared/layout/windowSizing` (or from `src/shared/layout`).
- No changes to persisted layout key or shape.
