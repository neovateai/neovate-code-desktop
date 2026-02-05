# Panel Collapsed Rename + Chat Min Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename panel state from `visible` to `collapsed` (true = collapsed, no backward compatibility) and increase chat panel min width to 320px.

**Architecture:** Update types, constants, and layout math to use `collapsed`. Adjust all panel visibility checks, toggles, and persisted layout parsing to the new shape, and update tests to validate the new semantics and chat min.

**Tech Stack:** React 19 + TypeScript, Zustand state, Electron renderer, Vitest.

---

### Task 1: Update Tests for `collapsed` Semantics + Chat Min 320

**Files:**
- Modify: `src/renderer/components/layout/layoutMath.test.ts`

**Step 1: Write the failing test**

Update tests to:
- Replace `.visible` with `.collapsed`
- Flip boolean expectations (`collapsed: true` means hidden)
- Update `CHAT_PANEL_MIN_SIZE` expectation to `320`

Example update:

```ts
const layout = {
  primarySidebar: { width: 300, collapsed: false },
  contentPanel: { width: 300, collapsed: false },
  secondarySidebar: { width: 300, collapsed: true },
};

test('constants reflect new panel mins and defaults', () => {
  expect(CHAT_PANEL_MIN_SIZE).toBe(320);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- layoutMath.test.ts`  
Expected: FAIL (types/functions still use `visible`, min size still 240).

**Step 3: Commit**

```bash
git add src/renderer/components/layout/layoutMath.test.ts
git commit -m "test: switch layout tests to collapsed semantics"
```

---

### Task 2: Rename Types + Constants to `collapsed`

**Files:**
- Modify: `src/renderer/components/layout/layoutTypes.ts`
- Modify: `src/renderer/constants.ts`
- Modify: `src/renderer/components/layout/AppLayoutProvider.tsx`

**Step 1: Write the failing test**

Add to `layoutMath.test.ts` (if needed):

```ts
test('default collapsed values are correct', () => {
  expect(PANEL_CONFIG.primarySidebar.defaultCollapsed).toBe(false);
  expect(PANEL_CONFIG.contentPanel.defaultCollapsed).toBe(true);
  expect(PANEL_CONFIG.secondarySidebar.defaultCollapsed).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- layoutMath.test.ts`  
Expected: FAIL (config uses `defaultVisible`).

**Step 3: Update types + constants**

```ts
// layoutTypes.ts
export type PanelState = { width: number; collapsed: boolean };
```

```ts
// constants.ts
export const CHAT_PANEL_MIN_SIZE = 320;

export const PANEL_CONFIG = {
  primarySidebar: { ... , defaultCollapsed: false },
  contentPanel: { ... , defaultCollapsed: true },
  secondarySidebar: { ... , defaultCollapsed: true },
};
```

**Step 4: Update provider defaults + persistence parsing**

In `AppLayoutProvider.tsx`:
- default layout uses `collapsed: defaultCollapsed`
- `loadLayout()` reads `panelState.collapsed` (ignores old `visible`)
- toggle flips `collapsed`

**Step 5: Run tests**

Run: `npm test -- layoutMath.test.ts`  
Expected: PASS.

**Step 6: Commit**

```bash
git add src/renderer/components/layout/layoutTypes.ts \
  src/renderer/constants.ts \
  src/renderer/components/layout/AppLayoutProvider.tsx \
  src/renderer/components/layout/layoutMath.test.ts
git commit -m "feat: rename panel visibility to collapsed and bump chat min"
```

---

### Task 3: Update Layout Math for `collapsed`

**Files:**
- Modify: `src/renderer/components/layout/layoutMath.ts`

**Step 1: Write the failing test**

Update any remaining tests to use `collapsed` and ensure `applyToggle` flips `collapsed`.

**Step 2: Run test to verify it fails**

Run: `npm test -- layoutMath.test.ts`  
Expected: FAIL until `layoutMath.ts` uses `collapsed`.

**Step 3: Implement**

Replace all `layout.*.visible` reads with `!layout.*.collapsed`.
Update `applyToggle` to flip `collapsed` and adjust any returned layout shapes.

**Step 4: Run tests**

Run: `npm test -- layoutMath.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/layout/layoutMath.ts \
  src/renderer/components/layout/layoutMath.test.ts
git commit -m "feat: update layout math to collapsed semantics"
```

---

### Task 4: Update UI Components + Call Sites

**Files:**
- Modify: `src/renderer/components/layout/AppLayout.tsx`
- Modify: `src/renderer/components/layout/ActivityBar.tsx`
- Modify: `src/renderer/components/layout/TrafficLightsSection.tsx`
- Modify: `src/renderer/components/layout/SecondarySidebarToggles.tsx`
- Modify: `src/renderer/components/SecondarySidebar/FileTree.tsx`

**Step 1: Write the failing test**

No new unit tests required; rely on typecheck + existing tests after refactor.

**Step 2: Implement**

Replace all `panel.visible` checks with `!panel.collapsed`, and update any derived `collapsed` booleans accordingly.

**Step 3: Run verification**

Run: `npm test -- layoutMath.test.ts`  
Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add src/renderer/components/layout/AppLayout.tsx \
  src/renderer/components/layout/ActivityBar.tsx \
  src/renderer/components/layout/TrafficLightsSection.tsx \
  src/renderer/components/layout/SecondarySidebarToggles.tsx \
  src/renderer/components/SecondarySidebar/FileTree.tsx
git commit -m "feat: switch panel visibility to collapsed in UI"
```
