# Multi-Panel Resize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the new multi-panel resize rules (dynamic max based on visible panels), remove content/chat hard max, add first-open 50/50 split for content, and auto-expand the window on panel open.

**Architecture:** Extract pure layout-math helpers (tested) and wire them into `AppLayoutProvider` for drag and toggle behaviors. Add a main-process IPC handler to adjust window width/minWidth on panel open, and simplify edge spacing by moving left padding to the outer layout container.

**Tech Stack:** React 19 + TypeScript, Zustand state, Electron main/renderer IPC, Vitest.

---

### Task 1: Add Layout Types + Layout Math Helpers (with tests)

**Files:**
- Create: `src/renderer/components/layout/layoutTypes.ts`
- Create: `src/renderer/components/layout/layoutMath.ts`
- Create: `src/renderer/components/layout/layoutMath.test.ts`
- Modify: `src/renderer/components/layout/AppLayoutProvider.tsx`
- Modify: `src/renderer/components/layout/AppLayout.tsx`

**Step 1: Write the failing tests**

```ts
// src/renderer/components/layout/layoutMath.test.ts
import {
  getHandleCount,
  getFixedWidth,
  getRequiredMinWidth,
  getDynamicMaxForContent,
  getFirstOpenContentWidth,
} from './layoutMath';

const constants = {
  activityBar: 48,
  edge: 8,
  handle: 5,
  chatMin: 240,
  contentMin: 300,
  primaryMin: 250,
  secondaryMin: 250,
};

const layout = {
  primarySidebar: { width: 300, visible: true },
  contentPanel: { width: 300, visible: true },
  secondarySidebar: { width: 300, visible: false },
};

test('handle count matches visible panels', () => {
  expect(getHandleCount(layout)).toBe(2);
});

test('fixed width includes activity + edge + handles', () => {
  expect(getFixedWidth(2, constants)).toBe(48 + 8 + 2 * 5);
});

test('required min width matches visible mins + fixed + primary width', () => {
  expect(getRequiredMinWidth(layout, constants)).toBe(
    48 + 8 + 2 * 5 + 300 + 240 + 300,
  );
});

test('dynamic max for content respects other mins', () => {
  const max = getDynamicMaxForContent({
    windowWidth: 1400,
    layout,
    constants,
  });
  // 1400 - fixed(66) - primary(300) - chatMin(240) - secondaryMin(0)
  expect(max).toBe(1400 - 66 - 300 - 240);
});

test('first open content uses 50/50 with mins', () => {
  const width = getFirstOpenContentWidth({
    windowWidth: 1200,
    layout: {
      ...layout,
      contentPanel: { width: 0, visible: false },
    },
    constants,
  });
  // available = 1200 - fixed(61) - primary(300)
  // half = 419.5 -> clamp to min 300
  expect(width).toBeGreaterThanOrEqual(300);
});
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- layoutMath.test.ts`
Expected: FAIL (missing module or function exports).

**Step 3: Write minimal implementation**

```ts
// src/renderer/components/layout/layoutTypes.ts
import { PANEL_CONFIG } from '../../constants';

export type PanelId = keyof typeof PANEL_CONFIG;
export type PanelState = { width: number; visible: boolean };
export type Layout = Record<PanelId, PanelState>;
```

```ts
// src/renderer/components/layout/layoutMath.ts
import type { Layout } from './layoutTypes';

export type LayoutConstants = {
  activityBar: number;
  edge: number;
  handle: number;
  chatMin: number;
  contentMin: number;
  primaryMin: number;
  secondaryMin: number;
};

export function getHandleCount(layout: Layout): number {
  return (
    (layout.primarySidebar.visible ? 1 : 0) +
    (layout.contentPanel.visible ? 1 : 0) +
    (layout.secondarySidebar.visible ? 1 : 0)
  );
}

export function getFixedWidth(
  handleCount: number,
  constants: Pick<LayoutConstants, 'activityBar' | 'edge' | 'handle'>,
): number {
  return constants.activityBar + constants.edge + handleCount * constants.handle;
}

export function getRequiredMinWidth(
  layout: Layout,
  constants: LayoutConstants,
): number {
  const handles = getHandleCount(layout);
  const fixed = getFixedWidth(handles, constants);
  const contentMin = layout.contentPanel.visible ? constants.contentMin : 0;
  const secondaryMin = layout.secondarySidebar.visible
    ? constants.secondaryMin
    : 0;
  const primaryWidth = layout.primarySidebar.visible
    ? layout.primarySidebar.width
    : 0;

  return fixed + primaryWidth + constants.chatMin + contentMin + secondaryMin;
}

export function getDynamicMaxForContent({
  windowWidth,
  layout,
  constants,
}: {
  windowWidth: number;
  layout: Layout;
  constants: LayoutConstants;
}): number {
  const handles = getHandleCount(layout);
  const fixed = getFixedWidth(handles, constants);
  const primaryWidth = layout.primarySidebar.visible
    ? layout.primarySidebar.width
    : 0;
  const secondaryMin = layout.secondarySidebar.visible
    ? constants.secondaryMin
    : 0;

  return windowWidth - fixed - primaryWidth - constants.chatMin - secondaryMin;
}

export function getFirstOpenContentWidth({
  windowWidth,
  layout,
  constants,
}: {
  windowWidth: number;
  layout: Layout;
  constants: LayoutConstants;
}): number {
  const handles = getHandleCount({
    ...layout,
    contentPanel: { width: 0, visible: true },
  });
  const fixed = getFixedWidth(handles, constants);
  const primaryWidth = layout.primarySidebar.visible
    ? layout.primarySidebar.width
    : 0;
  const available = windowWidth - fixed - primaryWidth;
  const half = available / 2;
  return Math.max(constants.contentMin, Math.min(half, available - constants.chatMin));
}
```

Update imports in `AppLayoutProvider.tsx`/`AppLayout.tsx` to use `layoutTypes.ts`.

**Step 4: Run the test to verify it passes**

Run: `npm test -- layoutMath.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/layout/layoutTypes.ts \
  src/renderer/components/layout/layoutMath.ts \
  src/renderer/components/layout/layoutMath.test.ts \
  src/renderer/components/layout/AppLayoutProvider.tsx \
  src/renderer/components/layout/AppLayout.tsx
git commit -m "test: add layout math helpers and types"
```

---

### Task 2: Update Layout Constants + Outer Edge Spacing

**Files:**
- Modify: `src/renderer/constants.ts`
- Modify: `src/renderer/components/layout/AppLayout.tsx`

**Step 1: Write the failing test**

```ts
// Add to layoutMath.test.ts
import { CHAT_PANEL_MIN_SIZE, PANEL_CONFIG } from '../../constants';

test('constants reflect new panel mins and defaults', () => {
  expect(CHAT_PANEL_MIN_SIZE).toBe(240);
  expect(PANEL_CONFIG.primarySidebar.minWidth).toBe(250);
  expect(PANEL_CONFIG.primarySidebar.maxWidth).toBe(600);
  expect(PANEL_CONFIG.secondarySidebar.defaultWidth).toBe(300);
  expect(PANEL_CONFIG.contentPanel.minWidth).toBe(300);
});
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- layoutMath.test.ts`
Expected: FAIL (old constants).

**Step 3: Update constants + layout root**

```ts
// src/renderer/constants.ts
export const CHAT_PANEL_MIN_SIZE = 240;

export const PANEL_CONFIG = {
  primarySidebar: { defaultWidth: 300, minWidth: 250, maxWidth: 600, defaultVisible: true },
  contentPanel: { defaultWidth: 300, minWidth: 300, maxWidth: Number.POSITIVE_INFINITY, defaultVisible: false },
  secondarySidebar: { defaultWidth: 300, minWidth: 250, maxWidth: 600, defaultVisible: false },
} as const;
```

```tsx
// src/renderer/components/layout/AppLayout.tsx
import { PANEL_WINDOW_EDGE_SPACING } from '../../constants';

export function AppLayoutRoot({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-full flex items-stretch relative"
      style={{ paddingLeft: PANEL_WINDOW_EDGE_SPACING }}
      data-app-layout-group
    >
      {children}
    </div>
  );
}

// Remove paddingLeft from AppLayoutPrimarySidebar container
// Update inner width to `panel.width` (no subtraction)
```

**Step 4: Run tests**

Run: `npm test -- layoutMath.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/constants.ts src/renderer/components/layout/AppLayout.tsx \
  src/renderer/components/layout/layoutMath.test.ts
git commit -m "feat: update panel constants and edge spacing"
```

---

### Task 3: Wire Dynamic Max Rules Into Dragging

**Files:**
- Modify: `src/renderer/components/layout/AppLayoutProvider.tsx`

**Step 1: Write the failing test**

```ts
// Add to layoutMath.test.ts
import { getDynamicMaxForContent } from './layoutMath';

test('dynamic max for content ignores hard max', () => {
  const max = getDynamicMaxForContent({
    windowWidth: 1600,
    layout: {
      primarySidebar: { width: 600, visible: true },
      contentPanel: { width: 400, visible: true },
      secondarySidebar: { width: 300, visible: true },
    },
    constants,
  });
  expect(max).toBe(1600 - (48 + 8 + 3 * 5) - 600 - 240 - 250);
});
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- layoutMath.test.ts`
Expected: FAIL if helpers or constants not updated.

**Step 3: Implement drag logic using helpers**

```ts
// AppLayoutProvider.tsx (inside mousemove)
if (resizing === 'primarySidebar') {
  const dynamicMax = getDynamicMaxForPrimary({ windowWidth, layout: layoutRef.current, constants });
  const next = Math.min(Math.max(e.clientX - PANEL_WINDOW_EDGE_SPACING, minWidth), Math.min(maxWidth, dynamicMax));
  setWidth('primarySidebar', next);
}
```

Repeat for content/secondary with new helper functions and dynamic max.

**Step 4: Run tests**

Run: `npm test -- layoutMath.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/layout/AppLayoutProvider.tsx \
  src/renderer/components/layout/layoutMath.test.ts
git commit -m "feat: apply dynamic max rules to drag sizing"
```

---

### Task 4: Open/Close Normalization + Auto-Resize Window

**Files:**
- Modify: `src/main/ipc/index.ts`
- Modify: `src/renderer/lib/ipc.ts`
- Modify: `src/renderer/components/layout/AppLayoutProvider.tsx`
- Modify: `src/shared/lib/ipc/main.ts` (if needed for new handler registration)

**Step 1: Write the failing test**

```ts
// Add to layoutMath.test.ts
import { getRequiredMinWidth } from './layoutMath';

test('required min uses visible mins only', () => {
  const min = getRequiredMinWidth(
    {
      primarySidebar: { width: 300, visible: true },
      contentPanel: { width: 0, visible: false },
      secondarySidebar: { width: 300, visible: false },
    },
    constants,
  );
  expect(min).toBe(48 + 8 + 1 * 5 + 300 + 240);
});
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- layoutMath.test.ts`
Expected: FAIL (until helper exists/updated).

**Step 3: Add IPC handler to resize window**

```ts
// src/main/ipc/index.ts
import { BrowserWindow, screen } from 'electron';

app: {
  ensureWindowWidth: createMainHandler<{ minWidth: number }, { appliedWidth: number; maxWidth: number }>(
    async ({ input }) => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!win) return { appliedWidth: 0, maxWidth: 0 };
      const display = screen.getDisplayMatching(win.getBounds());
      const maxWidth = display.workAreaSize.width;
      const target = Math.min(input.minWidth, maxWidth);
      const [, minH] = win.getMinimumSize();
      win.setMinimumSize(target, minH);
      const [curW, curH] = win.getSize();
      if (curW < target) win.setSize(target, curH);
      return { appliedWidth: Math.max(curW, target), maxWidth };
    },
  ),
  ...
}
```

**Step 4: Use IPC on toggle open + first-open content split**

```ts
// AppLayoutProvider.tsx (toggle)
const constants = { activityBar: ACTIVITY_BAR_WIDTH, edge: PANEL_WINDOW_EDGE_SPACING, handle: PANEL_PANEL_SPACING, chatMin: CHAT_PANEL_MIN_SIZE, contentMin: PANEL_CONFIG.contentPanel.minWidth, primaryMin: PANEL_CONFIG.primarySidebar.minWidth, secondaryMin: PANEL_CONFIG.secondarySidebar.minWidth };

const nextLayout = applyToggle({ layout: layoutRef.current, id, hasStoredLayout, windowWidth });
const requiredMin = getRequiredMinWidth(nextLayout, constants);
void ipcMainCaller.app.ensureWindowWidth({ minWidth: requiredMin });
setLayout(nextLayout);
saveLayout(nextLayout);
```

`applyToggle` should:
- Toggle `visible`
- If opening `content` and `!hasStoredLayout`, set width to `getFirstOpenContentWidth(...)`
- Otherwise keep prior width, but clamp to dynamic max (if >= min)

**Step 5: Run tests + typecheck**

Run: `npm test -- layoutMath.test.ts`  
Run: `npm run typecheck`

**Step 6: Commit**

```bash
git add src/main/ipc/index.ts src/renderer/components/layout/AppLayoutProvider.tsx \
  src/renderer/lib/ipc.ts src/renderer/components/layout/layoutMath.test.ts
git commit -m "feat: normalize panel widths on open and auto-resize window"
```

---

Plan complete and saved to `docs/plans/2026-02-05-multi-panel-resize-plan.md`.

Two execution options:
1. Subagent-Driven (this session)
2. Parallel Session (separate)

Which approach?**
