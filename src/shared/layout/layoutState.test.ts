import { expect, test } from 'vitest';
import { getDefaultLayout, parseStoredLayout } from './layoutState';
import { PANEL_CONFIG } from './constants';

test('getDefaultLayout uses panel defaults', () => {
  const layout = getDefaultLayout(PANEL_CONFIG);
  expect(layout.primarySidebar.width).toBe(
    PANEL_CONFIG.primarySidebar.defaultWidth,
  );
  expect(layout.contentPanel.collapsed).toBe(
    PANEL_CONFIG.contentPanel.defaultCollapsed,
  );
});

test('parseStoredLayout returns defaults for invalid JSON', () => {
  const layout = parseStoredLayout('{invalid', PANEL_CONFIG);
  expect(layout).toEqual(getDefaultLayout(PANEL_CONFIG));
});

test('parseStoredLayout clamps out-of-range widths', () => {
  const layout = parseStoredLayout(
    JSON.stringify({
      primarySidebar: { width: 9999, collapsed: false },
      contentPanel: { width: 10, collapsed: false },
      secondarySidebar: { width: 0, collapsed: true },
    }),
    PANEL_CONFIG,
  );
  expect(layout.primarySidebar.width).toBe(
    PANEL_CONFIG.primarySidebar.defaultWidth,
  );
  expect(layout.contentPanel.width).toBe(
    PANEL_CONFIG.contentPanel.defaultWidth,
  );
  expect(layout.secondarySidebar.collapsed).toBe(true);
});
