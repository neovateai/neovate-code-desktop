import { useRef, useEffect, type ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { useStore } from '../../store';
import { cn } from '@/lib/utils';

/*
 * 5-Panel Layout:
 * +--------+-------------+-----------+---------+-------+
 * | Tasks  | Chat (flex) | TabsPanel | Context | Tool  |
 * | 240px  | min 300px   | 300px     | 300px   | 48px  |
 * +--------+-------------+-----------+---------+-------+
 */

function PanelSeparator({ className }: { className?: string }) {
  return (
    <Separator
      className={cn(
        'w-px outline-none origin-center transition-[transform,background-color,opacity] data-[separator=hover]:scale-x-[2] data-[separator=active]:scale-x-[2] data-[separator=hover]:bg-[#93c5fd] data-[separator=active]:bg-[#3b82f6] data-[separator=hover]:opacity-90 data-[separator=active]:opacity-100 mask-[linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)]',
        'mx-1 my-2',
        className,
      )}
    />
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex-1 flex flex-row min-h-0">
      <Group orientation="horizontal" className="flex-1">
        {children}
      </Group>
    </div>
  );
}

// Tasks Panel (left sidebar) - collapsible
interface AppLayoutTasksPanelProps {
  children: ReactNode;
}

export function AppLayoutTasksPanel({ children }: AppLayoutTasksPanelProps) {
  const panelRef = useRef<PanelImperativeHandle>(null);
  const primarySidebarCollapsed = useStore((s) => s.primarySidebarCollapsed);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (primarySidebarCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [primarySidebarCollapsed]);

  return (
    <>
      <Panel
        panelRef={panelRef}
        defaultSize={240}
        minSize={240}
        maxSize="80%"
        collapsedSize={0}
        collapsible
      >
        <div className="px-2 pt-2">{children}</div>
      </Panel>
      <PanelSeparator />
    </>
  );
}

// Chat Panel (main content, always visible)
interface AppLayoutChatPanelProps {
  children: ReactNode;
}

export function AppLayoutChatPanel({ children }: AppLayoutChatPanelProps) {
  return (
    <Panel minSize={300} className="pb-2">
      <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
        {children}
      </div>
    </Panel>
  );
}

// Tabs Panel (terminal, logs)
interface AppLayoutTabsPanelProps {
  children: ReactNode;
}

export function AppLayoutTabsPanel({ children }: AppLayoutTabsPanelProps) {
  const terminalPanelCollapsed = useStore((s) => s.terminalPanelCollapsed);

  if (terminalPanelCollapsed) {
    return null;
  }

  return (
    <>
      <PanelSeparator />
      <Panel defaultSize={600} minSize={300} className="pb-2">
        <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
          {children}
        </div>
      </Panel>
    </>
  );
}

// Secondary Sidebar (files, git - collapsible)
interface AppLayoutSecondarySidebarProps {
  children: ReactNode;
}

export function AppLayoutSecondarySidebar({
  children,
}: AppLayoutSecondarySidebarProps) {
  const secondarySidebarCollapsed = useStore(
    (s) => s.secondarySidebarCollapsed,
  );
  const secondarySidebarSize = useStore((s) => s.secondarySidebarSize);
  const setSecondarySidebarCollapsed = useStore(
    (s) => s.setSecondarySidebarCollapsed,
  );
  const setSecondarySidebarSize = useStore((s) => s.setSecondarySidebarSize);

  const handleResize = (size: { asPercentage: number; inPixels: number }) => {
    const isCollapsed = size.asPercentage === 0;
    if (isCollapsed && !secondarySidebarCollapsed) {
      setSecondarySidebarCollapsed(true);
    }

    if (!isCollapsed) {
      setSecondarySidebarSize(size.inPixels);
    }
  };

  if (secondarySidebarCollapsed) {
    return null;
  }

  return (
    <>
      <PanelSeparator />
      <Panel
        defaultSize={secondarySidebarSize}
        minSize={200}
        maxSize="80%"
        collapsedSize={0}
        collapsible
        onResize={handleResize}
        className="pb-2"
      >
        <div className="h-full overflow-hidden rounded-lg bg-(--bg-primary)">
          {children}
        </div>
      </Panel>
    </>
  );
}

// Activity Bar wrapper (fixed width, always visible, outside of resizable group)
interface AppLayoutActivityBarProps {
  children: ReactNode;
}

export function AppLayoutActivityBar({ children }: AppLayoutActivityBarProps) {
  return <>{children}</>;
}

// Legacy exports for backward compatibility
export { AppLayoutTasksPanel as AppLayoutSidebar };
export { AppLayoutChatPanel as AppLayoutPrimaryPanel };
export { AppLayoutTabsPanel as AppLayoutSecondaryPanel };
