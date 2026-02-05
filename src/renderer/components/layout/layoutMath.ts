import type { Layout, PanelId } from './layoutTypes';

export type LayoutConstants = {
  activityBar: number;
  edge: number;
  handle: number;
  chatMin: number;
  contentMin: number;
  primaryMin: number;
  secondaryMin: number;
};

export type PanelSizeConfig = Record<
  PanelId,
  { minWidth: number; maxWidth: number }
>;

export function getHandleCount(layout: Layout): number {
  return (
    (layout.primarySidebar.collapsed ? 0 : 1) +
    (layout.contentPanel.collapsed ? 0 : 1) +
    (layout.secondarySidebar.collapsed ? 0 : 1)
  );
}

export function getFixedWidth(
  handleCount: number,
  constants: Pick<LayoutConstants, 'activityBar' | 'edge' | 'handle'>,
): number {
  return (
    constants.activityBar + constants.edge + handleCount * constants.handle
  );
}

export function getRequiredMinWidth(
  layout: Layout,
  constants: LayoutConstants,
): number {
  const handles = getHandleCount(layout);
  const fixed = getFixedWidth(handles, constants);
  const contentMin = layout.contentPanel.collapsed ? 0 : constants.contentMin;
  const secondaryMin = layout.secondarySidebar.collapsed
    ? 0
    : constants.secondaryMin;
  const primaryWidth = layout.primarySidebar.collapsed
    ? 0
    : layout.primarySidebar.width;

  return fixed + primaryWidth + constants.chatMin + contentMin + secondaryMin;
}

export function getRequiredCurrentWidth(
  layout: Layout,
  constants: LayoutConstants,
): number {
  const handles = getHandleCount(layout);
  const fixed = getFixedWidth(handles, constants);
  const contentWidth = layout.contentPanel.collapsed
    ? 0
    : layout.contentPanel.width;
  const secondaryWidth = layout.secondarySidebar.collapsed
    ? 0
    : layout.secondarySidebar.width;
  const primaryWidth = layout.primarySidebar.collapsed
    ? 0
    : layout.primarySidebar.width;

  return (
    fixed + primaryWidth + constants.chatMin + contentWidth + secondaryWidth
  );
}

export function fitLayoutToWindow({
  layout,
  windowWidth,
  constants,
}: {
  layout: Layout;
  windowWidth: number;
  constants: LayoutConstants;
}): Layout {
  const requiredCurrent = getRequiredCurrentWidth(layout, constants);
  if (requiredCurrent <= windowWidth) return layout;

  let overflow = requiredCurrent - windowWidth;
  let next = layout;

  if (!next.secondarySidebar.collapsed && overflow > 0) {
    const current = next.secondarySidebar.width;
    const shrink = Math.min(
      Math.max(current - constants.secondaryMin, 0),
      overflow,
    );
    if (shrink > 0) {
      next = {
        ...next,
        secondarySidebar: {
          ...next.secondarySidebar,
          width: current - shrink,
        },
      };
      overflow -= shrink;
    }
  }

  if (!next.contentPanel.collapsed && overflow > 0) {
    const current = next.contentPanel.width;
    const shrink = Math.min(
      Math.max(current - constants.contentMin, 0),
      overflow,
    );
    if (shrink > 0) {
      next = {
        ...next,
        contentPanel: {
          ...next.contentPanel,
          width: current - shrink,
        },
      };
      overflow -= shrink;
    }
  }

  return next;
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
  const primaryWidth = layout.primarySidebar.collapsed
    ? 0
    : layout.primarySidebar.width;
  const secondaryWidth = layout.secondarySidebar.collapsed
    ? 0
    : layout.secondarySidebar.width;

  return (
    windowWidth - fixed - primaryWidth - constants.chatMin - secondaryWidth
  );
}

export function getDynamicMaxForPrimary({
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
  const contentWidth = layout.contentPanel.collapsed
    ? 0
    : layout.contentPanel.width;
  const secondaryWidth = layout.secondarySidebar.collapsed
    ? 0
    : layout.secondarySidebar.width;

  return (
    windowWidth - fixed - constants.chatMin - contentWidth - secondaryWidth
  );
}

export function getDynamicMaxForSecondary({
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
  const primaryWidth = layout.primarySidebar.collapsed
    ? 0
    : layout.primarySidebar.width;
  const contentWidth = layout.contentPanel.collapsed
    ? 0
    : layout.contentPanel.width;

  return windowWidth - fixed - primaryWidth - constants.chatMin - contentWidth;
}

export function clampWidth(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function getPrimaryWidthFromMouse({
  clientX,
  windowWidth,
  layout,
  constants,
  minWidth,
  maxWidth,
}: {
  clientX: number;
  windowWidth: number;
  layout: Layout;
  constants: LayoutConstants;
  minWidth: number;
  maxWidth: number;
}): number {
  const dynamicMax = getDynamicMaxForPrimary({
    windowWidth,
    layout,
    constants,
  });
  const max = Math.min(maxWidth, dynamicMax);
  return clampWidth(clientX - constants.edge, minWidth, max);
}

export function getContentWidthFromMouse({
  clientX,
  windowWidth,
  layout,
  constants,
  minWidth,
}: {
  clientX: number;
  windowWidth: number;
  layout: Layout;
  constants: LayoutConstants;
  minWidth: number;
}): number {
  const dynamicMax = getDynamicMaxForContent({
    windowWidth,
    layout,
    constants,
  });
  const secondaryWidth = layout.secondarySidebar.collapsed
    ? 0
    : layout.secondarySidebar.width;
  const secondaryHandle = layout.secondarySidebar.collapsed
    ? 0
    : constants.handle;
  const rightBoundary =
    windowWidth - constants.activityBar - secondaryWidth - secondaryHandle;
  return clampWidth(rightBoundary - clientX, minWidth, dynamicMax);
}

export function getSecondaryWidthFromMouse({
  clientX,
  windowWidth,
  layout,
  constants,
  minWidth,
  maxWidth,
}: {
  clientX: number;
  windowWidth: number;
  layout: Layout;
  constants: LayoutConstants;
  minWidth: number;
  maxWidth: number;
}): number {
  const dynamicMax = getDynamicMaxForSecondary({
    windowWidth,
    layout,
    constants,
  });
  const max = Math.min(maxWidth, dynamicMax);
  return clampWidth(
    windowWidth - clientX - constants.activityBar,
    minWidth,
    max,
  );
}

export function applyToggle({
  layout,
  id,
  windowWidth,
  constants,
  panelConfig,
  hasStoredLayout,
}: {
  layout: Layout;
  id: PanelId;
  windowWidth: number;
  constants: LayoutConstants;
  panelConfig: PanelSizeConfig;
  hasStoredLayout: boolean;
}): Layout {
  const wasCollapsed = layout[id].collapsed;
  const next: Layout = {
    ...layout,
    [id]: { ...layout[id], collapsed: !wasCollapsed },
  };

  if (!wasCollapsed) return next;

  if (id === 'contentPanel' && !hasStoredLayout) {
    return {
      ...next,
      contentPanel: {
        ...next.contentPanel,
        width: getFirstOpenContentWidth({
          windowWidth,
          layout: next,
          constants,
        }),
      },
    };
  }

  const minWidth = panelConfig[id].minWidth;
  const hardMax = panelConfig[id].maxWidth;
  let dynamicMax = hardMax;

  if (id === 'primarySidebar') {
    dynamicMax = Math.min(
      hardMax,
      getDynamicMaxForPrimary({ windowWidth, layout: next, constants }),
    );
  } else if (id === 'contentPanel') {
    dynamicMax = getDynamicMaxForContent({
      windowWidth,
      layout: next,
      constants,
    });
  } else if (id === 'secondarySidebar') {
    dynamicMax = Math.min(
      hardMax,
      getDynamicMaxForSecondary({ windowWidth, layout: next, constants }),
    );
  }

  return {
    ...next,
    [id]: {
      ...next[id],
      width: clampWidth(next[id].width, minWidth, dynamicMax),
    },
  };
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
    contentPanel: { width: 0, collapsed: false },
  });
  const fixed = getFixedWidth(handles, constants);
  const primaryWidth = layout.primarySidebar.collapsed
    ? 0
    : layout.primarySidebar.width;
  const available = windowWidth - fixed - primaryWidth;
  const half = available / 2;
  return Math.max(
    constants.contentMin,
    Math.min(half, available - constants.chatMin),
  );
}
