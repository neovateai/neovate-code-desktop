import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderIcon,
  GitBranchIcon,
  ComputerTerminal01Icon,
} from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { Button, Separator } from '../ui';
import { useAppLayoutPanels, AppLayoutPanelId } from './app-layout-provider';
import type { SecondarySidebarTab } from '../../store/slices/ui-slice';

export const ActivityBar = memo(function ActivityBar() {
  const { panels, layout } = useAppLayoutPanels();

  const secondarySidebarTab = useStore((s) => s.secondarySidebarTab);
  const setSecondarySidebarTab = useStore((s) => s.setSecondarySidebarTab);

  const contentPanel = panels[AppLayoutPanelId.ContentPanel];
  const secondarySidebar = panels[AppLayoutPanelId.SecondarySidebar];

  const contentPanelCollapsed = layout[AppLayoutPanelId.ContentPanel] === 0;
  const secondarySidebarCollapsed =
    layout[AppLayoutPanelId.SecondarySidebar] === 0;

  const handleTabClick = (tab: SecondarySidebarTab) => {
    if (secondarySidebarTab === tab && !secondarySidebar?.isCollapsed()) {
      secondarySidebar?.collapse();
    } else {
      setSecondarySidebarTab(tab);
      secondarySidebar?.expand();
    }
  };

  const toggleContentPanel = () => {
    if (contentPanel?.isCollapsed()) {
      contentPanel?.expand();
    } else {
      contentPanel?.collapse();
    }
  };

  return (
    <div className="w-12 flex flex-col items-center py-2 shrink-0 h-full">
      <ActivityBarButton
        icon={FolderIcon}
        onClick={() => handleTabClick('files')}
        active={secondarySidebarTab === 'files' && !secondarySidebarCollapsed}
        title="Files"
      />
      <ActivityBarButton
        icon={GitBranchIcon}
        onClick={() => handleTabClick('git')}
        active={secondarySidebarTab === 'git' && !secondarySidebarCollapsed}
        title="Git"
      />
      <Separator className="w-6 my-1" />
      <ActivityBarButton
        icon={ComputerTerminal01Icon}
        onClick={toggleContentPanel}
        active={!contentPanelCollapsed}
        title="Terminal"
      />
    </div>
  );
});

interface ActivityBarButtonProps {
  icon: typeof FolderIcon;
  onClick: () => void;
  active?: boolean;
  title?: string;
}

function ActivityBarButton({
  icon,
  onClick,
  active,
  title,
}: ActivityBarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      title={title}
      className={cn(
        'hover:bg-[color-mix(in_oklab,var(--background),white_20%)]',
        active && 'bg-[color-mix(in_oklab,var(--background),white_40%)]',
      )}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
    </Button>
  );
}
