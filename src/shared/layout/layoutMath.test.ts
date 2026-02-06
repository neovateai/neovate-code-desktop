import { expect, test } from 'vitest';
import {
  getHandleCount,
  getFixedWidth,
  getRequiredMinWidth,
  getDynamicMaxForContent,
  getDynamicMaxForPrimary,
  getDynamicMaxForSecondary,
  getFirstOpenContentWidth,
  getRequiredCurrentWidth,
  fitLayoutToWindow,
  clampWidth,
  getPrimaryWidthFromMouse,
  getContentWidthFromMouse,
  getSecondaryWidthFromMouse,
  getResizeWidthFromMouse,
  applyToggle,
} from './layoutMath';
import { CHAT_PANEL_MIN_SIZE, PANEL_CONFIG } from './constants';

const constants = {
  activityBar: 48,
  edge: 8,
  handle: 5,
  chatMin: 320,
  contentMin: 300,
  primaryMin: 250,
  secondaryMin: 240,
};

const layout = {
  primarySidebar: { width: 300, collapsed: false },
  contentPanel: { width: 300, collapsed: false },
  secondarySidebar: { width: 300, collapsed: true },
};

const panelConfig = {
  primarySidebar: { minWidth: 250, maxWidth: 600 },
  contentPanel: { minWidth: 300, maxWidth: Number.POSITIVE_INFINITY },
  secondarySidebar: { minWidth: 240, maxWidth: 600 },
};

test('handle count matches expanded panels', () => {
  expect(getHandleCount(layout)).toBe(2);
});

test('fixed width includes activity + edge + handles', () => {
  expect(getFixedWidth(2, constants)).toBe(48 + 8 + 2 * 5);
});

test('required min width matches expanded mins + fixed + primary width', () => {
  expect(getRequiredMinWidth(layout, constants)).toBe(
    48 + 8 + 2 * 5 + 300 + 320 + 300,
  );
});

test('required current width uses expanded panel widths', () => {
  const currentLayout = {
    primarySidebar: { width: 300, collapsed: false },
    contentPanel: { width: 520, collapsed: false },
    secondarySidebar: { width: 420, collapsed: false },
  };
  expect(getRequiredCurrentWidth(currentLayout, constants)).toBe(
    48 + 8 + 3 * 5 + 300 + 320 + 520 + 420,
  );
});

test('fit layout shrinks secondary then content to fit window', () => {
  const next = fitLayoutToWindow({
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 520, collapsed: false },
      secondarySidebar: { width: 420, collapsed: false },
    },
    windowWidth: 1400,
    constants,
  });
  expect(next.secondarySidebar.width).toBe(240);
  expect(next.contentPanel.width).toBe(469);
});

test('dynamic max for content respects other mins', () => {
  const max = getDynamicMaxForContent({
    windowWidth: 1400,
    layout,
    constants,
  });
  // 1400 - fixed(66) - primary(300) - chatMin(320) - secondaryWidth(0)
  expect(max).toBe(1400 - 66 - 300 - 320);
});

test('first open content uses 50/50 with mins', () => {
  const width = getFirstOpenContentWidth({
    windowWidth: 1200,
    layout: {
      ...layout,
      contentPanel: { width: 0, collapsed: true },
    },
    constants,
  });
  // available = 1200 - fixed(61) - primary(300)
  // half = 419.5 -> clamp to min 300
  expect(width).toBeGreaterThanOrEqual(300);
});

test('constants reflect new panel mins and defaults', () => {
  expect(CHAT_PANEL_MIN_SIZE).toBe(320);
  expect(PANEL_CONFIG.primarySidebar.minWidth).toBe(250);
  expect(PANEL_CONFIG.primarySidebar.maxWidth).toBe(600);
  expect(PANEL_CONFIG.secondarySidebar.defaultWidth).toBe(240);
  expect(PANEL_CONFIG.secondarySidebar.minWidth).toBe(240);
  expect(PANEL_CONFIG.contentPanel.minWidth).toBe(300);
});

test('dynamic max for content ignores hard max', () => {
  const max = getDynamicMaxForContent({
    windowWidth: 1600,
    layout: {
      primarySidebar: { width: 600, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 500, collapsed: false },
    },
    constants,
  });
  expect(max).toBe(1600 - (48 + 8 + 3 * 5) - 600 - 320 - 500);
});

test('dynamic max for primary reserves other mins', () => {
  const max = getDynamicMaxForPrimary({
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 450, collapsed: false },
      secondarySidebar: { width: 500, collapsed: false },
    },
    constants,
  });
  expect(max).toBe(1400 - (48 + 8 + 3 * 5) - 320 - 450 - 500);
});

test('dynamic max for secondary reserves other mins', () => {
  const max = getDynamicMaxForSecondary({
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 450, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
  });
  expect(max).toBe(1400 - (48 + 8 + 3 * 5) - 300 - 320 - 450);
});

test('clampWidth returns min when max is smaller', () => {
  expect(clampWidth(100, 300, 200)).toBe(300);
});

test('primary width from mouse applies edge offset and dynamic max', () => {
  const width = getPrimaryWidthFromMouse({
    clientX: 700,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    minWidth: 240,
    maxWidth: 600,
  });
  expect(width).toBe(309);
});

test('content width from mouse respects right boundary and dynamic max', () => {
  const width = getContentWidthFromMouse({
    clientX: 600,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    minWidth: 300,
  });
  expect(width).toBe(409);
});

test('secondary width from mouse respects activity bar and dynamic max', () => {
  const width = getSecondaryWidthFromMouse({
    clientX: 900,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    minWidth: 250,
    maxWidth: 600,
  });
  expect(width).toBe(309);
});

test('getResizeWidthFromMouse uses primary sizing branch', () => {
  const width = getResizeWidthFromMouse({
    resizing: 'primarySidebar',
    clientX: 700,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    panelConfig,
  });
  expect(width).toBe(309);
});

test('getResizeWidthFromMouse uses content sizing branch', () => {
  const width = getResizeWidthFromMouse({
    resizing: 'contentPanel',
    clientX: 600,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    panelConfig,
  });
  expect(width).toBe(409);
});

test('getResizeWidthFromMouse uses secondary sizing branch', () => {
  const width = getResizeWidthFromMouse({
    resizing: 'secondarySidebar',
    clientX: 900,
    windowWidth: 1400,
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 300, collapsed: false },
    },
    constants,
    panelConfig,
  });
  expect(width).toBe(309);
});

test('required min uses expanded mins only', () => {
  const min = getRequiredMinWidth(
    {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 0, collapsed: true },
      secondarySidebar: { width: 300, collapsed: true },
    },
    constants,
  );
  expect(min).toBe(48 + 8 + 1 * 5 + 300 + 320);
});

test('applyToggle splits content width on first open', () => {
  const next = applyToggle({
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 0, collapsed: true },
      secondarySidebar: { width: 300, collapsed: true },
    },
    id: 'contentPanel',
    windowWidth: 1200,
    constants,
    panelConfig,
    hasStoredLayout: false,
  });
  expect(next.contentPanel.collapsed).toBe(false);
  expect(next.contentPanel.width).toBeGreaterThanOrEqual(300);
});

test('applyToggle clamps reopened secondary width to dynamic max', () => {
  const next = applyToggle({
    layout: {
      primarySidebar: { width: 300, collapsed: false },
      contentPanel: { width: 400, collapsed: false },
      secondarySidebar: { width: 900, collapsed: true },
    },
    id: 'secondarySidebar',
    windowWidth: 1400,
    constants,
    panelConfig,
    hasStoredLayout: true,
  });
  expect(next.secondarySidebar.collapsed).toBe(false);
  expect(next.secondarySidebar.width).toBeLessThanOrEqual(600);
});
