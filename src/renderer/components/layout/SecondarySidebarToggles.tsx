import {
  PanelRightIcon,
  ViewSidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '../ui/button';
import { useAppLayoutPanels } from './AppLayoutProvider';

export function SecondarySidebarToggles() {
  const { getPanel, toggle } = useAppLayoutPanels();
  const panel = getPanel('secondarySidebar');
  const collapsed = panel.collapsed;

  return (
    <div
      className="flex items-center shrink-0 pr-2"
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => toggle('secondarySidebar')}
        title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        <HugeiconsIcon
          icon={collapsed ? PanelRightIcon : ViewSidebarRightIcon}
          size={18}
          strokeWidth={1.5}
        />
      </Button>
    </div>
  );
}
