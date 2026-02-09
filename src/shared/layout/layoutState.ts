import type { Layout, PanelId } from './types';
import type { PANEL_CONFIG } from './constants';

export type PanelConfig = typeof PANEL_CONFIG;

export function getDefaultLayout(panelConfig: PanelConfig): Layout {
  return {
    primarySidebar: {
      width: panelConfig.primarySidebar.defaultWidth,
      collapsed: panelConfig.primarySidebar.defaultCollapsed,
    },
    contentPanel: {
      width: panelConfig.contentPanel.defaultWidth,
      collapsed: panelConfig.contentPanel.defaultCollapsed,
    },
    secondarySidebar: {
      width: panelConfig.secondarySidebar.defaultWidth,
      collapsed: panelConfig.secondarySidebar.defaultCollapsed,
    },
  };
}

export function parseStoredLayout(
  stored: string | null | undefined,
  panelConfig: PanelConfig,
): Layout {
  if (!stored) return getDefaultLayout(panelConfig);

  try {
    const parsed = JSON.parse(stored) as Partial<Layout>;
    const defaults = getDefaultLayout(panelConfig);
    const layout: Layout = { ...defaults };

    for (const key of Object.keys(defaults) as PanelId[]) {
      if (!parsed[key]) continue;
      const panelState = parsed[key];
      const config = panelConfig[key];

      const width =
        typeof panelState.width === 'number' &&
        !Number.isNaN(panelState.width) &&
        panelState.width >= config.minWidth &&
        panelState.width <= config.maxWidth
          ? panelState.width
          : config.defaultWidth;

      const collapsed =
        typeof panelState.collapsed === 'boolean'
          ? panelState.collapsed
          : config.defaultCollapsed;

      layout[key] = { width, collapsed };
    }

    return layout;
  } catch {
    return getDefaultLayout(panelConfig);
  }
}
