import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { STORAGE_KEY_APP_LAYOUT } from '../../constants';
import {
  ACTIVITY_BAR_WIDTH,
  CHAT_PANEL_MIN_SIZE,
  PANEL_CONFIG,
  PANEL_PANEL_SPACING,
  PANEL_WINDOW_EDGE_SPACING,
  applyToggle,
  fitLayoutToWindow,
  getDefaultLayout,
  getResizeWidthFromMouse,
  getRequiredCurrentWidth,
  getRequiredMinWidth,
  parseStoredLayout,
  type Layout,
  type PanelId,
  type PanelState,
} from '../../../shared/layout';
import { ipcMainCaller } from '../../lib/ipc';

export type { Layout, PanelId, PanelState } from '../../../shared/layout';

interface AppLayoutContextValue {
  layout: Layout;
  resizing: PanelId | null;

  getPanel: (id: PanelId) => PanelState;
  setWidth: (id: PanelId, width: number) => void;
  toggle: (id: PanelId) => void;
  startResize: (id: PanelId) => void;
}

const LAYOUT_CONSTANTS = {
  activityBar: ACTIVITY_BAR_WIDTH,
  edge: PANEL_WINDOW_EDGE_SPACING,
  handle: PANEL_PANEL_SPACING,
  chatMin: CHAT_PANEL_MIN_SIZE,
  contentMin: PANEL_CONFIG.contentPanel.minWidth,
  primaryMin: PANEL_CONFIG.primarySidebar.minWidth,
  secondaryMin: PANEL_CONFIG.secondarySidebar.minWidth,
};

const PANEL_SIZE_CONFIG = {
  primarySidebar: {
    minWidth: PANEL_CONFIG.primarySidebar.minWidth,
    maxWidth: PANEL_CONFIG.primarySidebar.maxWidth,
  },
  contentPanel: {
    minWidth: PANEL_CONFIG.contentPanel.minWidth,
    maxWidth: PANEL_CONFIG.contentPanel.maxWidth,
  },
  secondarySidebar: {
    minWidth: PANEL_CONFIG.secondarySidebar.minWidth,
    maxWidth: PANEL_CONFIG.secondarySidebar.maxWidth,
  },
};

// =============================================================================
// Helpers
// =============================================================================

function loadLayout(): Layout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_APP_LAYOUT);
    return parseStoredLayout(stored, PANEL_CONFIG);
  } catch {
    return getDefaultLayout(PANEL_CONFIG);
  }
}

function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(STORAGE_KEY_APP_LAYOUT, JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

// =============================================================================
// Context
// =============================================================================

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function useAppLayoutPanels() {
  const context = useContext(AppLayoutContext);
  if (!context) {
    throw new Error(
      'useAppLayoutPanels must be used within AppLayoutPanelProvider',
    );
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

export function AppLayoutPanelProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [resizing, setResizing] = useState<PanelId | null>(null);

  // Ref for layout to avoid stale closure in mouseup handler
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const getPanel = useCallback(
    (id: PanelId): PanelState => layout[id],
    [layout],
  );

  const setWidth = useCallback((id: PanelId, width: number) => {
    const config = PANEL_CONFIG[id];
    const clamped = Math.max(config.minWidth, Math.min(config.maxWidth, width));
    setLayout((prev) => ({
      ...prev,
      [id]: { ...prev[id], width: clamped },
    }));
  }, []);

  const toggle = useCallback((id: PanelId) => {
    const hasStoredLayout = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY_APP_LAYOUT) !== null;
      } catch {
        return false;
      }
    })();

    setLayout((prev) => {
      let nextLayout = applyToggle({
        layout: prev,
        id,
        windowWidth: window.innerWidth,
        constants: LAYOUT_CONSTANTS,
        panelConfig: PANEL_SIZE_CONFIG,
        hasStoredLayout,
      });

      const requiredMin = getRequiredMinWidth(nextLayout, LAYOUT_CONSTANTS);
      const targetWidth = Math.max(window.innerWidth, requiredMin);
      if (window.innerWidth < requiredMin) {
        void ipcMainCaller.window.ensureWidth({ minWidth: requiredMin });
      }
      nextLayout = fitLayoutToWindow({
        layout: nextLayout,
        windowWidth: targetWidth,
        constants: LAYOUT_CONSTANTS,
      });
      const nextRequiredMin = getRequiredMinWidth(nextLayout, LAYOUT_CONSTANTS);
      void ipcMainCaller.window.ensureWidth({ minWidth: nextRequiredMin });

      // Persist immediately on toggle
      saveLayout(nextLayout);
      return nextLayout;
    });
  }, []);

  const startResize = useCallback((id: PanelId) => {
    setResizing(id);
  }, []);

  // Global drag listener
  useEffect(() => {
    if (!resizing) return;

    const ensureWindowForLayout = (nextLayout: Layout) => {
      const requiredCurrent = getRequiredCurrentWidth(
        nextLayout,
        LAYOUT_CONSTANTS,
      );
      if (requiredCurrent > window.innerWidth) {
        void ipcMainCaller.window.ensureWidth({
          minWidth: requiredCurrent,
        });
      }
    };

    const applyResize = (id: PanelId, width: number) => {
      const nextLayout: Layout = {
        ...layoutRef.current,
        [id]: { ...layoutRef.current[id], width },
      };
      ensureWindowForLayout(nextLayout);
      setWidth(id, width);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const next = getResizeWidthFromMouse({
        resizing,
        clientX: e.clientX,
        windowWidth: window.innerWidth,
        layout: layoutRef.current,
        constants: LAYOUT_CONSTANTS,
        panelConfig: PANEL_SIZE_CONFIG,
      });
      if (next !== null) applyResize(resizing, next);
    };

    const handleMouseUp = () => {
      const requiredMin = getRequiredMinWidth(
        layoutRef.current,
        LAYOUT_CONSTANTS,
      );
      void ipcMainCaller.window.ensureWidth({ minWidth: requiredMin });
      // Persist layout on drag end
      saveLayout(layoutRef.current);
      setResizing(null);
    };

    // Cancel drag if window loses focus (mouseup outside window)
    const handleBlur = () => {
      const requiredMin = getRequiredMinWidth(
        layoutRef.current,
        LAYOUT_CONSTANTS,
      );
      void ipcMainCaller.window.ensureWidth({ minWidth: requiredMin });
      saveLayout(layoutRef.current);
      setResizing(null);
    };

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [resizing, setWidth]);

  const contextValue = useMemo(
    () => ({
      layout,
      resizing,
      getPanel,
      setWidth,
      toggle,
      startResize,
    }),
    [layout, resizing, getPanel, setWidth, toggle, startResize],
  );

  return (
    <AppLayoutContext.Provider value={contextValue}>
      {children}
    </AppLayoutContext.Provider>
  );
}
