import { cn } from '../../lib/utils';
import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ACTIVITY_BAR_WIDTH,
  CHAT_PANEL_MIN_SIZE,
  PANEL_PANEL_SPACING,
  PANEL_WINDOW_EDGE_SPACING,
  TITLEBAR_SIDEBAR_TOGGLE_WIDTH,
  TRAFFIC_LIGHTS_SPACER_WIDTH,
} from '../../constants';
import {
  type PanelId,
  AppLayoutPanelProvider,
  useAppLayoutPanels,
} from './AppLayoutProvider';
import { useResizeGradient } from './useResizeGradient';

// Spring transition - critically damped (no bounce, fast response)
const springTransition = {
  type: 'spring' as const,
  stiffness: 600,
  damping: 49,
};

export function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutPanelProvider>{children}</AppLayoutPanelProvider>;
}

/**
 * Outer layout container
 */
export function AppLayoutRoot({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-full flex items-stretch relative"
      style={{ paddingLeft: PANEL_WINDOW_EDGE_SPACING }}
      data-app-layout-group
    >
      {children}
    </div>
  );
}

// Derived constant
const COLLAPSED_TITLEBAR_LEFT_PADDING =
  TRAFFIC_LIGHTS_SPACER_WIDTH + TITLEBAR_SIDEBAR_TOGGLE_WIDTH;

/**
 * Reusable resize handle component
 * Width matches PANEL_PANEL_SPACING (5px) with expanded hit area via padding
 */
function ResizeHandle({ panelId }: { panelId: PanelId }) {
  const { getPanel, resizing, startResize } = useAppLayoutPanels();
  const panel = getPanel(panelId);
  const { ref, handlers, gradientStyle } = useResizeGradient(panelId);

  if (panel.collapsed) return null;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        e.preventDefault();
        startResize(panelId);
      }}
      onMouseMove={handlers.onMouseMove}
      onMouseLeave={handlers.onMouseLeave}
      className="h-full cursor-col-resize shrink-0 relative"
      style={{ width: PANEL_PANEL_SPACING }}
    >
      <div className="absolute inset-y-0 -inset-x-1" />
      {/* Gradient overlay */}
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5"
        style={{
          ...gradientStyle,
          transition:
            resizing === panelId ? undefined : 'opacity 0.15s ease-out',
        }}
      />
    </div>
  );
}

/**
 * Primary sidebar with custom resize and collapse
 * Uses framer-motion for smooth animations
 */
export function AppLayoutPrimarySidebar({ children }: { children: ReactNode }) {
  const { getPanel, resizing } = useAppLayoutPanels();
  const panel = getPanel('primarySidebar');

  return (
    <>
      {/* Animated width container */}
      <motion.div
        initial={false}
        animate={{
          width: panel.collapsed ? 0 : panel.width,
        }}
        transition={
          resizing === 'primarySidebar' ? { duration: 0 } : springTransition
        }
        className="h-full overflow-hidden shrink-0"
        style={{
          paddingTop: PANEL_WINDOW_EDGE_SPACING,
          paddingBottom: PANEL_WINDOW_EDGE_SPACING,
        }}
      >
        {/* Card container with fixed width (prevents reflow during animation) */}
        <div
          style={{ width: panel.width }}
          className={cn(
            'h-full flex flex-col min-h-0 pt-8 relative',
            'bg-card rounded-l-[14px] rounded-r-[10px]',
            'shadow-[0_0_6px_rgba(0,0,0,0.06)]',
          )}
        >
          {children}
        </div>
      </motion.div>

      {/* Resize handle */}
      <ResizeHandle panelId="primarySidebar" />
    </>
  );
}

export function AppLayoutRightContainer({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex-1 h-full flex flex-col min-w-0"
      style={{ paddingBottom: PANEL_WINDOW_EDGE_SPACING }}
    >
      {children}
    </div>
  );
}

export function AppLayoutTitleBar({ children }: { children: ReactNode }) {
  const { getPanel } = useAppLayoutPanels();
  const panel = getPanel('primarySidebar');

  return (
    <div
      className="h-11 flex items-center select-none shrink-0 transition-[padding-left] duration-150 ease-out"
      style={{
        paddingLeft: panel.collapsed ? COLLAPSED_TITLEBAR_LEFT_PADDING : 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Inner panel group: ChatPanel + ContentPanel + SecondarySidebar
 * Uses flex layout with motion-based panels
 */
export function AppLayoutPanelRow({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-1 h-full min-w-0 overflow-hidden"
      data-app-panels-group
    >
      {children}
    </div>
  );
}

export function AppLayoutChatPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex-1 overflow-hidden"
      style={{ minWidth: CHAT_PANEL_MIN_SIZE }}
    >
      <div className="h-full rounded-lg bg-card pb-2">{children}</div>
    </div>
  );
}

export function AppLayoutContentPanel({ children }: { children: ReactNode }) {
  const { getPanel, resizing } = useAppLayoutPanels();
  const panel = getPanel('contentPanel');

  return (
    <>
      <ResizeHandle panelId="contentPanel" />
      <motion.div
        initial={false}
        animate={{
          width: panel.collapsed ? 0 : panel.width,
        }}
        transition={
          resizing === 'contentPanel' ? { duration: 0 } : springTransition
        }
        className="h-full overflow-hidden shrink-0"
      >
        {/* Inner content with fixed width */}
        <div style={{ width: panel.width }} className="h-full">
          <div className="h-full overflow-hidden rounded-lg bg-card pb-2">
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function AppLayoutSecondarySidebar({
  children,
}: {
  children: ReactNode;
}) {
  const { getPanel, resizing } = useAppLayoutPanels();
  const panel = getPanel('secondarySidebar');

  return (
    <>
      <ResizeHandle panelId="secondarySidebar" />
      <motion.div
        initial={false}
        animate={{
          width: panel.collapsed ? 0 : panel.width,
        }}
        transition={
          resizing === 'secondarySidebar' ? { duration: 0 } : springTransition
        }
        className="h-full overflow-hidden shrink-0"
      >
        {/* Inner content with fixed width */}
        <div style={{ width: panel.width }} className="h-full">
          <div className="h-full overflow-hidden rounded-lg bg-card pb-2">
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function AppLayoutActivityBar({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 h-full" style={{ width: ACTIVITY_BAR_WIDTH }}>
      {children}
    </div>
  );
}
