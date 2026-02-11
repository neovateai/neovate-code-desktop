export const CHAT_PANEL_MIN_SIZE = 320;
export const ACTIVITY_BAR_WIDTH = 48;
export const PANEL_WINDOW_EDGE_SPACING = 8;
export const PANEL_PANEL_SPACING = 5;
export const TRAFFIC_LIGHTS_SPACER_WIDTH = 76;
export const TITLEBAR_SIDEBAR_TOGGLE_WIDTH = 60;

export const PANEL_CONFIG = {
  primarySidebar: {
    defaultWidth: 300,
    minWidth: 250,
    maxWidth: 600,
    defaultCollapsed: false,
  },
  contentPanel: {
    defaultWidth: 300,
    minWidth: 300,
    maxWidth: Number.POSITIVE_INFINITY,
    defaultCollapsed: true,
  },
  secondarySidebar: {
    defaultWidth: 240,
    minWidth: 240,
    maxWidth: 600,
    defaultCollapsed: true,
  },
} as const;
