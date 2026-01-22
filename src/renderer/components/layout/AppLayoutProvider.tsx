import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  usePanelRef,
  useGroupRef,
  type Layout,
  type PanelImperativeHandle,
  type GroupImperativeHandle,
} from 'react-resizable-panels';
import {
  DEFAULT_PANEL_EXPAND_SIZE,
  CONTENT_PANEL_MIN_SIZE,
} from '../../constants';

export const AppLayoutPanelId = {
  PrimarySidebar: 'primary-sidebar',
  ChatPanel: 'chat-panel',
  ContentPanel: 'content-panel',
  SecondarySidebar: 'secondary-sidebar',
} as const;

export type AppLayoutPanelIdType =
  (typeof AppLayoutPanelId)[keyof typeof AppLayoutPanelId];

type PanelRefs = Record<
  AppLayoutPanelIdType,
  RefObject<PanelImperativeHandle | null>
>;

interface AppLayoutPanelContextValue {
  groupRef: RefObject<GroupImperativeHandle | null>;
  panelRefs: PanelRefs;
  layout: Layout;
  setLayout: (layout: Layout) => void;
  isPrimarySidebarCollapsed: () => boolean;
  isContentPanelCollapsed: () => boolean;
  isSecondarySidebarCollapsed: () => boolean;
  togglePrimarySidebar: () => void;
  toggleContentPanel: () => void;
  toggleSecondarySidebar: () => void;
}

const AppLayoutPanelContext = createContext<AppLayoutPanelContextValue | null>(
  null,
);

export function useAppLayoutPanels() {
  const context = useContext(AppLayoutPanelContext);
  if (!context) {
    throw new Error(
      'useAppLayoutPanels must be used within AppLayoutPanelProvider',
    );
  }
  return context;
}

export function AppLayoutPanelProvider({ children }: { children: ReactNode }) {
  const groupRef = useGroupRef();

  // All panel refs organized by panel ID
  const panelRefs: PanelRefs = {
    [AppLayoutPanelId.PrimarySidebar]: usePanelRef(),
    [AppLayoutPanelId.ChatPanel]: usePanelRef(),
    [AppLayoutPanelId.ContentPanel]: usePanelRef(),
    [AppLayoutPanelId.SecondarySidebar]: usePanelRef(),
  };

  // Layout state synced from Group's onLayoutChanged
  const [layout, setLayoutState] = useState<Layout>({});

  const setLayout = useCallback((newLayout: Layout) => {
    setLayoutState(newLayout);
  }, []);

  // Derived collapsed state from layout
  const isPrimarySidebarCollapsed = useCallback(
    () => layout[AppLayoutPanelId.PrimarySidebar] === 0,
    [layout],
  );

  const isContentPanelCollapsed = useCallback(
    () => layout[AppLayoutPanelId.ContentPanel] === 0,
    [layout],
  );

  const isSecondarySidebarCollapsed = useCallback(
    () => layout[AppLayoutPanelId.SecondarySidebar] === 0,
    [layout],
  );

  // Remember panel sizes before collapse
  const contentPanelSizeRef = useRef(DEFAULT_PANEL_EXPAND_SIZE);
  const secondarySidebarSizeRef = useRef(DEFAULT_PANEL_EXPAND_SIZE);
  // Remember how much SecondarySidebar borrowed from ContentPanel when expanding
  const borrowedFromContentPanelRef = useRef(0);

  const togglePrimarySidebar = () => {
    const panel = panelRefs[AppLayoutPanelId.PrimarySidebar].current;
    if (!panel) return;
    if (isPrimarySidebarCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };

  const toggleContentPanel = () => {
    const group = groupRef.current;
    if (!group) return;

    const currentLayout = group.getLayout();

    if (isContentPanelCollapsed()) {
      // Expand ContentPanel: borrow space only from ChatPanel
      const expandSize = contentPanelSizeRef.current;
      const newLayout = {
        ...currentLayout,
        [AppLayoutPanelId.ChatPanel]:
          currentLayout[AppLayoutPanelId.ChatPanel] - expandSize,
        [AppLayoutPanelId.ContentPanel]: expandSize,
      };
      group.setLayout(newLayout);
    } else {
      // Save current size before collapse
      contentPanelSizeRef.current =
        currentLayout[AppLayoutPanelId.ContentPanel];
      // Collapse ContentPanel: return all space to ChatPanel
      const newLayout = {
        ...currentLayout,
        [AppLayoutPanelId.ChatPanel]:
          currentLayout[AppLayoutPanelId.ChatPanel] +
          currentLayout[AppLayoutPanelId.ContentPanel],
        [AppLayoutPanelId.ContentPanel]: 0,
      };
      group.setLayout(newLayout);
    }
  };

  const toggleSecondarySidebar = () => {
    const group = groupRef.current;
    if (!group) return;

    const currentLayout = group.getLayout();

    if (isSecondarySidebarCollapsed()) {
      // Expand SecondarySidebar
      const expandSize = secondarySidebarSizeRef.current;
      const contentPanelSize = currentLayout[AppLayoutPanelId.ContentPanel];
      const contentPanelExpanded = contentPanelSize > 0;

      let newLayout;
      let borrowedFromContentPanel = 0;

      if (contentPanelExpanded) {
        // Both ChatPanel and ContentPanel are expanded, calculate how much to borrow from each
        const halfSize = expandSize / 2;
        // Get ContentPanel's actual pixel width to determine how much it can lend
        const contentPanelCurrent =
          panelRefs[AppLayoutPanelId.ContentPanel].current;
        const contentPanelPixelSize =
          contentPanelCurrent?.getSize().inPixels ?? 0;
        // Space ContentPanel can lend (keeping minSize)
        const contentPanelCanGive = Math.max(
          0,
          contentPanelPixelSize - CONTENT_PANEL_MIN_SIZE,
        );
        // Convert to percentage (rough estimate)
        const containerWidth = contentPanelPixelSize / (contentPanelSize / 100);
        const contentPanelCanGivePercent =
          (contentPanelCanGive / containerWidth) * 100;

        if (contentPanelCanGivePercent >= halfSize) {
          // ContentPanel can lend half, distribute evenly
          borrowedFromContentPanel = halfSize;
          newLayout = {
            ...currentLayout,
            [AppLayoutPanelId.ChatPanel]:
              currentLayout[AppLayoutPanelId.ChatPanel] - halfSize,
            [AppLayoutPanelId.ContentPanel]: contentPanelSize - halfSize,
            [AppLayoutPanelId.SecondarySidebar]: expandSize,
          };
        } else {
          // ContentPanel can't lend half, borrow what it can, rest from ChatPanel
          borrowedFromContentPanel = contentPanelCanGivePercent;
          const fromChatPanel = expandSize - borrowedFromContentPanel;
          newLayout = {
            ...currentLayout,
            [AppLayoutPanelId.ChatPanel]:
              currentLayout[AppLayoutPanelId.ChatPanel] - fromChatPanel,
            [AppLayoutPanelId.ContentPanel]:
              contentPanelSize - borrowedFromContentPanel,
            [AppLayoutPanelId.SecondarySidebar]: expandSize,
          };
        }
      } else {
        // Only ChatPanel is expanded, borrow from ChatPanel
        borrowedFromContentPanel = 0;
        newLayout = {
          ...currentLayout,
          [AppLayoutPanelId.ChatPanel]:
            currentLayout[AppLayoutPanelId.ChatPanel] - expandSize,
          [AppLayoutPanelId.SecondarySidebar]: expandSize,
        };
      }

      // Remember how much was borrowed from ContentPanel
      borrowedFromContentPanelRef.current = borrowedFromContentPanel;
      group.setLayout(newLayout);
    } else {
      // Save current size before collapse
      secondarySidebarSizeRef.current =
        currentLayout[AppLayoutPanelId.SecondarySidebar];

      // Collapse SecondarySidebar: return space proportionally
      const returnToContentPanel = borrowedFromContentPanelRef.current;
      const returnToChatPanel =
        currentLayout[AppLayoutPanelId.SecondarySidebar] - returnToContentPanel;

      const newLayout = {
        ...currentLayout,
        [AppLayoutPanelId.ChatPanel]:
          currentLayout[AppLayoutPanelId.ChatPanel] + returnToChatPanel,
        [AppLayoutPanelId.ContentPanel]:
          currentLayout[AppLayoutPanelId.ContentPanel] + returnToContentPanel,
        [AppLayoutPanelId.SecondarySidebar]: 0,
      };

      // Reset borrowed record
      borrowedFromContentPanelRef.current = 0;
      group.setLayout(newLayout);
    }
  };

  return (
    <AppLayoutPanelContext.Provider
      value={{
        groupRef,
        panelRefs,
        layout,
        setLayout,
        isPrimarySidebarCollapsed,
        isContentPanelCollapsed,
        isSecondarySidebarCollapsed,
        togglePrimarySidebar,
        toggleContentPanel,
        toggleSecondarySidebar,
      }}
    >
      {children}
    </AppLayoutPanelContext.Provider>
  );
}
