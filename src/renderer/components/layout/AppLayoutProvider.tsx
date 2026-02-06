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
import {
  ACTIVITY_BAR_WIDTH,
  CHAT_PANEL_MIN_SIZE,
  PANEL_CONFIG,
  STORAGE_KEY_APP_LAYOUT,
} from '../../constants';

// =============================================================================
// Types
// =============================================================================

export type PanelId = keyof typeof PANEL_CONFIG;

export type PanelState = {
  width: number;
  visible: boolean;
};

export type Layout = Record<PanelId, PanelState>;

interface AppLayoutContextValue {
  layout: Layout;
  resizing: PanelId | null;

  getPanel: (id: PanelId) => PanelState;
  setWidth: (id: PanelId, width: number) => void;
  toggle: (id: PanelId) => void;
  startResize: (id: PanelId) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getDefaultLayout(): Layout {
  return {
    primarySidebar: {
      width: PANEL_CONFIG.primarySidebar.defaultWidth,
      visible: PANEL_CONFIG.primarySidebar.defaultVisible,
    },
    contentPanel: {
      width: PANEL_CONFIG.contentPanel.defaultWidth,
      visible: PANEL_CONFIG.contentPanel.defaultVisible,
    },
    secondarySidebar: {
      width: PANEL_CONFIG.secondarySidebar.defaultWidth,
      visible: PANEL_CONFIG.secondarySidebar.defaultVisible,
    },
  };
}

function loadLayout(): Layout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_APP_LAYOUT);
    if (!stored) return getDefaultLayout();

    const parsed = JSON.parse(stored) as Partial<Layout>;
    const defaults = getDefaultLayout();

    // Validate and merge with defaults
    const layout: Layout = { ...defaults };
    for (const key of Object.keys(defaults) as PanelId[]) {
      if (parsed[key]) {
        const config = PANEL_CONFIG[key];
        const panelState = parsed[key];

        // Validate width
        const width =
          typeof panelState.width === 'number' &&
          !Number.isNaN(panelState.width) &&
          panelState.width >= config.minWidth &&
          panelState.width <= config.maxWidth
            ? panelState.width
            : config.defaultWidth;

        // Validate visible
        const visible =
          typeof panelState.visible === 'boolean'
            ? panelState.visible
            : config.defaultVisible;

        layout[key] = { width, visible };
      }
    }

    return layout;
  } catch {
    return getDefaultLayout();
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
    setLayout((prev) => {
      const newLayout = {
        ...prev,
        [id]: { ...prev[id], visible: !prev[id].visible },
      };
      // Persist immediately on toggle
      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const startResize = useCallback((id: PanelId) => {
    setResizing(id);
  }, []);

  // Global drag listener
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { minWidth, maxWidth } = PANEL_CONFIG[resizing];

      if (resizing === 'primarySidebar') {
        setWidth(
          'primarySidebar',
          Math.min(Math.max(e.clientX, minWidth), maxWidth),
        );
      } else if (resizing === 'contentPanel') {
        const primaryWidth = layoutRef.current.primarySidebar.visible
          ? layoutRef.current.primarySidebar.width
          : 0;
        const secondaryWidth = layoutRef.current.secondarySidebar.visible
          ? layoutRef.current.secondarySidebar.width
          : 0;
        // Calculate available space, ensuring chat panel keeps minimum size
        const availableWidth =
          window.innerWidth -
          ACTIVITY_BAR_WIDTH -
          primaryWidth -
          secondaryWidth -
          CHAT_PANEL_MIN_SIZE;
        const dynamicMax = Math.min(maxWidth, availableWidth);
        const rightBoundary =
          window.innerWidth - ACTIVITY_BAR_WIDTH - secondaryWidth;
        setWidth(
          'contentPanel',
          Math.min(Math.max(rightBoundary - e.clientX, minWidth), dynamicMax),
        );
      } else if (resizing === 'secondarySidebar') {
        setWidth(
          'secondarySidebar',
          Math.min(
            Math.max(
              window.innerWidth - e.clientX - ACTIVITY_BAR_WIDTH,
              minWidth,
            ),
            maxWidth,
          ),
        );
      }
    };

    const handleMouseUp = () => {
      // Persist layout on drag end
      saveLayout(layoutRef.current);
      setResizing(null);
    };

    // Cancel drag if window loses focus (mouseup outside window)
    const handleBlur = () => {
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
