import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { usePanelCallbackRef } from 'react-resizable-panels';

export const AppLayoutPanelId = {
  PrimarySidebar: 'primary-sidebar',
  ChatPanel: 'chat-panel',
  ContentPanel: 'content-panel',
  SecondarySidebar: 'secondary-sidebar',
} as const;

type AppLayoutPanelIdType =
  (typeof AppLayoutPanelId)[keyof typeof AppLayoutPanelId];

// usePanelCallbackRef returns [handle, setterRef]
type PanelCallbackRef = ReturnType<typeof usePanelCallbackRef>;
type PanelSetterRef = PanelCallbackRef[1];

export type AppLayoutPanelType = Record<AppLayoutPanelIdType, number>;

interface AppLayoutPanelContextValue {
  // Panel refs to pass to Panel components
  panelRefs: Record<AppLayoutPanelIdType, PanelSetterRef>;
  // Panel handles for imperative control
  panels: Record<AppLayoutPanelIdType, PanelImperativeHandle | null>;
  layout: Record<AppLayoutPanelIdType, number>;
  setLayout: Dispatch<SetStateAction<AppLayoutPanelType>>;
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
  // Create callback refs for each panel using usePanelCallbackRef
  // Returns [handle, setterRef] tuple
  const [primarySidebar, setPrimarySidebar] = usePanelCallbackRef();
  const [chatPanel, setChatPanel] = usePanelCallbackRef();
  const [contentPanel, setContentPanel] = usePanelCallbackRef();
  const [secondarySidebar, setSecondarySidebar] = usePanelCallbackRef();

  const [layout, setLayout] = useState<AppLayoutPanelType>(
    {} as AppLayoutPanelType,
  );

  const panelRefs = {
    [AppLayoutPanelId.PrimarySidebar]: setPrimarySidebar,
    [AppLayoutPanelId.ChatPanel]: setChatPanel,
    [AppLayoutPanelId.ContentPanel]: setContentPanel,
    [AppLayoutPanelId.SecondarySidebar]: setSecondarySidebar,
  } as Record<AppLayoutPanelIdType, PanelSetterRef>;

  const panels = {
    [AppLayoutPanelId.PrimarySidebar]: primarySidebar,
    [AppLayoutPanelId.ChatPanel]: chatPanel,
    [AppLayoutPanelId.ContentPanel]: contentPanel,
    [AppLayoutPanelId.SecondarySidebar]: secondarySidebar,
  } as Record<AppLayoutPanelIdType, PanelImperativeHandle | null>;

  return (
    <AppLayoutPanelContext.Provider
      value={{ panelRefs, panels, layout, setLayout }}
    >
      {children}
    </AppLayoutPanelContext.Provider>
  );
}
