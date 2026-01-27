import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from 'react-resizable-panels';
import {
  STORAGE_KEY_APP_LAYOUT,
  CHAT_PANEL_MIN_SIZE,
  CONTENT_PANEL_MIN_SIZE,
  PRIMARY_SIDEBAR_MIN_SIZE,
  PRIMARY_SIDEBAR_DEFAULT_SIZE,
  SECONDARY_SIDEBAR_MIN_SIZE,
  SECONDARY_SIDEBAR_MAX_SIZE,
} from '../../constants';
import {
  AppLayoutPanelId,
  AppLayoutPanelProvider,
  useAppLayoutPanels,
} from './AppLayoutProvider';

export function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutPanelProvider>{children}</AppLayoutPanelProvider>;
}

export function AppLayoutPanelGroup({ children }: { children: ReactNode }) {
  const { groupRef, setLayout } = useAppLayoutPanels();

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: STORAGE_KEY_APP_LAYOUT,
    panelIds: [
      AppLayoutPanelId.PrimarySidebar,
      AppLayoutPanelId.ChatPanel,
      AppLayoutPanelId.ContentPanel,
      AppLayoutPanelId.SecondarySidebar,
    ],
  });

  const handleLayoutChanged = (layout: Record<string, number>) => {
    onLayoutChanged(layout);
    setLayout(layout);
  };

  return (
    <Group
      orientation="horizontal"
      className="flex-1"
      data-app-layout
      groupRef={groupRef}
      defaultLayout={defaultLayout}
      onLayoutChanged={handleLayoutChanged}
    >
      {children}
    </Group>
  );
}

export function AppLayoutPrimarySidebar({ children }: { children: ReactNode }) {
  const { panelRefs } = useAppLayoutPanels();

  return (
    <>
      <Panel
        id={AppLayoutPanelId.PrimarySidebar}
        collapsible
        collapsedSize={0}
        defaultSize={PRIMARY_SIDEBAR_DEFAULT_SIZE}
        minSize={PRIMARY_SIDEBAR_MIN_SIZE}
        panelRef={panelRefs[AppLayoutPanelId.PrimarySidebar]}
      >
        <div className="px-2 h-full">{children}</div>
      </Panel>
      <PanelSeparator />
    </>
  );
}

export function AppLayoutChatPanel({ children }: { children: ReactNode }) {
  const { panelRefs } = useAppLayoutPanels();

  return (
    <Panel
      id={AppLayoutPanelId.ChatPanel}
      minSize={CHAT_PANEL_MIN_SIZE}
      panelRef={panelRefs[AppLayoutPanelId.ChatPanel]}
      className="overflow-hidden"
    >
      <div className="ml-2 h-full rounded-lg bg-(--bg-primary) pb-2">
        {children}
      </div>
    </Panel>
  );
}

export function AppLayoutContentPanel({ children }: { children: ReactNode }) {
  const { panelRefs } = useAppLayoutPanels();

  return (
    <>
      <PanelSeparator />
      <Panel
        id={AppLayoutPanelId.ContentPanel}
        collapsible
        collapsedSize={0}
        defaultSize={0}
        minSize={CONTENT_PANEL_MIN_SIZE}
        panelRef={panelRefs[AppLayoutPanelId.ContentPanel]}
      >
        <div className="ml-2 h-full overflow-hidden rounded-lg bg-(--bg-primary) pb-2">
          {children}
        </div>
      </Panel>
    </>
  );
}

export function AppLayoutSecondarySidebar({
  children,
}: {
  children: ReactNode;
}) {
  const { panelRefs } = useAppLayoutPanels();

  return (
    <>
      <PanelSeparator />
      <Panel
        id={AppLayoutPanelId.SecondarySidebar}
        collapsible
        collapsedSize={0}
        defaultSize={0}
        minSize={SECONDARY_SIDEBAR_MIN_SIZE}
        maxSize={SECONDARY_SIDEBAR_MAX_SIZE}
        panelRef={panelRefs[AppLayoutPanelId.SecondarySidebar]}
      >
        <div className="ml-2 h-full overflow-hidden rounded-lg bg-(--bg-primary) pb-2">
          {children}
        </div>
      </Panel>
    </>
  );
}

export function AppLayoutActivityBar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AppLayoutTitleBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-11 flex items-center px-3 select-none shrink-0"
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'drag' }}
    >
      {children}
    </div>
  );
}

function PanelSeparator({ className }: { className?: string }) {
  return (
    <Separator
      className={cn(
        'w-0 relative data-[orientation=horizontal]:h-full',
        'before:absolute before:inset-y-0 before:w-0.5 before:left-0.75',
        'before:bg-transparent before:transition-colors',
        'before:mask-[linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)]',
        'data-[separator=hover]:before:bg-[#93c5fd] data-[separator=active]:before:bg-[#3b82f6]',
        className,
      )}
    />
  );
}
