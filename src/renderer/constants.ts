// =============================================================================
// WebSocket Configuration
// =============================================================================
export const DEFAULT_WEBSOCKET_URL = 'ws://localhost:1024/ws';
export const WEBSOCKET_RECONNECT_INTERVAL_MS = 1000;
export const WEBSOCKET_MAX_RECONNECT_INTERVAL_MS = 30000;

// =============================================================================
// Timing & Debounce
// =============================================================================
export const INPUT_DEBOUNCE_MS = 150;
export const PERSISTENCE_DEBOUNCE_MS = 500;
export const DOUBLE_PRESS_TIMEOUT_MS = 500;
export const FOCUS_DELAY_MS = 100;
export const FORK_MODAL_DELAY_MS = 50;

// =============================================================================
// Animation
// =============================================================================
export const MIN_LOADING_TIME_MS = 2000;
export const LETTER_ANIMATION_DELAY_MS = 120;

// =============================================================================
// UI Thresholds
// =============================================================================
export const AUTO_SCROLL_THRESHOLD_PX = 300;
export const LARGE_PASTE_THRESHOLD = 800;
export const FILE_SEARCH_MAX_RESULTS = 100;

// =============================================================================
// Terminal
// =============================================================================
export const TERMINAL_SAVE_DEBOUNCE_MS = 2000;
export const TERMINAL_SAVE_COOLDOWN_MS = 3000;
export const TERMINAL_MAX_SCROLLBACK_LINES = 1000;

// =============================================================================
// Content Panel
// =============================================================================
export const CONTENT_TAB_PERSIST_DELAY_MS = 300;

// =============================================================================
// Toast & Notifications
// =============================================================================
export const UPDATER_TOAST_DISMISS_MS = 3000;

// =============================================================================
// Layout Panel Sizes (in pixels)
// =============================================================================
export const CHAT_PANEL_MIN_SIZE = 300;
export const ACTIVITY_BAR_WIDTH = 48;

// Layout spacing
export const PANEL_WINDOW_EDGE_SPACING = 8;
export const PANEL_PANEL_SPACING = 5;
export const TRAFFIC_LIGHTS_SPACER_WIDTH = 76;
export const TITLEBAR_SIDEBAR_TOGGLE_WIDTH = 32;

// Panel configuration for unified layout system
export const PANEL_CONFIG = {
  primarySidebar: {
    defaultWidth: 220,
    minWidth: 250,
    maxWidth: 320,
    defaultVisible: true,
  },
  contentPanel: {
    defaultWidth: 300,
    minWidth: 240,
    maxWidth: 480,
    defaultVisible: false,
  },
  secondarySidebar: {
    defaultWidth: 260,
    minWidth: 240,
    maxWidth: 480,
    defaultVisible: false,
  },
} as const;

// =============================================================================
// Storage Keys
// =============================================================================
export const STORAGE_KEY_APP_LAYOUT = 'neovate-app-layout';

// =============================================================================
// Defaults
// =============================================================================
export const DEFAULT_LOCALE = 'en-US';
