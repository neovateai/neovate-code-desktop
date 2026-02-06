import { PanelLeftIcon, ViewSidebarLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { useAppLayoutPanels } from './AppLayoutProvider';

// Spring transition - matches AppLayout
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// Toggle button position calculation:
// - Traffic lights: x=16, y=16, 12px diameter, 8px gap between buttons
// - Three buttons span: 12 + 8 + 12 + 8 + 12 = 52px, ends at x = 16 + 52 = 68
// - Traffic lights vertical center: y = 16 + 6 = 22
// - Toggle button: 22x22px
// - Horizontal: traffic lights end (68) + 8px gap + 6px extra = 82
// - Vertical: center at y=22, so top = 22 - 11 = 11

export function TrafficLightsSection() {
  const { getPanel, toggle } = useAppLayoutPanels();
  const panel = getPanel('primarySidebar');

  return (
    <div
      className="fixed z-[100] pointer-events-auto"
      style={
        { top: 11, left: 82, WebkitAppRegion: 'no-drag' } as React.CSSProperties
      }
    >
      <Button
        variant="ghost"
        size="icon"
        className="!size-6 relative"
        onClick={() => toggle('primarySidebar')}
        title={panel.visible ? 'Hide sidebar' : 'Show sidebar'}
      >
        {/* Cross-fade between icons - both rendered, opacity animated */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: panel.visible ? 1 : 0 }}
          transition={springTransition}
        >
          <HugeiconsIcon
            icon={ViewSidebarLeftIcon}
            size={18}
            strokeWidth={1.5}
          />
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: panel.visible ? 0 : 1 }}
          transition={springTransition}
        >
          <HugeiconsIcon icon={PanelLeftIcon} size={18} strokeWidth={1.5} />
        </motion.span>
      </Button>
    </div>
  );
}
