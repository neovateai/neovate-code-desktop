import { cn } from '@/lib/utils';
import {
  PanelLeftIcon,
  PanelRightIcon,
  PlusSignIcon,
  Settings01Icon,
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from 'react-resizable-panels';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';
import { Button } from '../ui/button';
import { Separator as UISeparator } from '../ui/separator';
import {
  AppLayoutPanelId,
  AppLayoutPanelProvider,
  AppLayoutPanelType,
  useAppLayoutPanels,
} from './app-layout-provider';

export function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutPanelProvider>{children}</AppLayoutPanelProvider>;
}

export function AppLayoutPanelGroup({ children }: { children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'neovate-app-layout',
    panelIds: [
      AppLayoutPanelId.PrimarySidebar,
      AppLayoutPanelId.ChatPanel,
      AppLayoutPanelId.ContentPanel,
      // AppLayoutPanelId.SecondarySidebar,
    ],
    storage: localStorage,
    debounceSaveMs: 50,
  });
  const { setLayout } = useAppLayoutPanels();
  return (
    <Group
      id="app-layout"
      defaultLayout={defaultLayout}
      onLayoutChanged={(layout) => {
        onLayoutChanged({ ...layout });
        setLayout({ ...layout } as AppLayoutPanelType);
      }}
      orientation="horizontal"
      className="flex-1"
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
        panelRef={panelRefs[AppLayoutPanelId.PrimarySidebar]}
        defaultSize={'25%'}
        minSize={240}
        maxSize="80%"
        collapsible
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
      panelRef={panelRefs[AppLayoutPanelId.ChatPanel]}
      defaultSize="70%"
      minSize="20%"
      className="pb-2"
      collapsible={false}
    >
      <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
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
        panelRef={panelRefs[AppLayoutPanelId.ContentPanel]}
        defaultSize={0}
        minSize={400}
        collapsible
        maxSize="80%"
        className="pb-2"
      >
        <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
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
  const { panelRefs, layout } = useAppLayoutPanels();

  return (
    <>
      <PanelSeparator dragable={!!layout[AppLayoutPanelId.SecondarySidebar]} />
      <Panel
        id={AppLayoutPanelId.SecondarySidebar}
        panelRef={panelRefs[AppLayoutPanelId.SecondarySidebar]}
        defaultSize={0}
        minSize={240}
        maxSize="30%"
        collapsible
        className="pb-2"
      >
        <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
          {children}
        </div>
      </Panel>
    </>
  );
}

export function AppLayoutActivityBar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AppLayoutTitleBar() {
  const { panels, layout } = useAppLayoutPanels();
  const setShowSettings = useStore((s) => s.setShowSettings);

  const primarySidebar = panels[AppLayoutPanelId.PrimarySidebar];
  const secondarySidebar = panels[AppLayoutPanelId.SecondarySidebar];

  const primarySidebarCollapsed = layout[AppLayoutPanelId.PrimarySidebar] === 0;
  const secondarySidebarCollapsed =
    layout[AppLayoutPanelId.SecondarySidebar] === 0;

  const togglePrimarySidebar = () => {
    if (primarySidebarCollapsed) {
      primarySidebar?.expand();
    } else {
      primarySidebar?.collapse();
    }
  };

  const toggleSecondarySidebar = () => {
    console.log(
      'toggleSecondarySidebar',
      panels[AppLayoutPanelId.SecondarySidebar],
      panels[AppLayoutPanelId.SecondarySidebar]?.isCollapsed(),
    );
    if (panels[AppLayoutPanelId.SecondarySidebar]?.isCollapsed()) {
      secondarySidebar?.expand();
    } else {
      secondarySidebar?.collapse();
    }
  };

  return (
    <div
      className="h-11 flex items-center px-3 select-none shrink-0"
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Traffic lights area - leave space for macOS buttons */}
      <div className="w-[68px] shrink-0" />

      {/* Interactive buttons - non-draggable */}
      <div
        className="flex items-center gap-1"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <TitleBarButton
          icon={primarySidebarCollapsed ? PanelLeftIcon : ViewSidebarLeftIcon}
          onClick={togglePrimarySidebar}
          title={primarySidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        />
        <AddRepoMenu>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Add repository"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.5} />
          </Button>
        </AddRepoMenu>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side buttons */}
      <div
        className="flex items-center gap-1"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <TitleBarButton
          icon={Settings01Icon}
          onClick={() => setShowSettings(true)}
          title="Settings"
        />
        <UISeparator
          orientation="vertical"
          className="h-4 mx-1 bg-(--border-elevated)"
        />
        <TitleBarButton
          icon={
            secondarySidebarCollapsed ? PanelRightIcon : ViewSidebarRightIcon
          }
          onClick={toggleSecondarySidebar}
          title={secondarySidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        />
      </div>
    </div>
  );
}

function TitleBarButton({
  icon,
  onClick,
  title,
}: {
  icon: typeof PanelLeftIcon;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={onClick}
      title={title}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.5} />
    </Button>
  );
}

function PanelSeparator({
  className,
  dragable = true,
}: {
  className?: string;
  dragable?: boolean;
}) {
  const baseClassName = cn(
    'w-px outline-none origin-center transition-[transform,background-color,opacity] mask-[linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)]',
    'mx-1 my-2',
    className,
  );

  if (!dragable) {
    return <div className={baseClassName} />;
  }

  return (
    <Separator
      className={cn(
        baseClassName,
        'data-[separator=hover]:scale-x-[2] data-[separator=active]:scale-x-[2] data-[separator=hover]:bg-[#93c5fd] data-[separator=active]:bg-[#3b82f6] data-[separator=hover]:opacity-90 data-[separator=active]:opacity-100',
      )}
    />
  );
}
