import {
  DashboardSquare01FreeIcons,
  FolderIcon,
  GitBranchIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import type { SecondarySidebarTab } from '../../store/slices/ui';
import { Button, Separator } from '../ui';
import { useAppLayoutPanels } from './AppLayoutProvider';

export const ActivityBar = function ActivityBar() {
  const {
    isContentPanelCollapsed,
    isSecondarySidebarCollapsed,
    toggleContentPanel,
    toggleSecondarySidebar,
  } = useAppLayoutPanels();

  const secondarySidebarTab = useStore((s) => s.secondarySidebarTab);
  const setSecondarySidebarTab = useStore((s) => s.setSecondarySidebarTab);

  const handleTabClick = (tab: SecondarySidebarTab) => {
    if (secondarySidebarTab === tab && !isSecondarySidebarCollapsed()) {
      toggleSecondarySidebar();
    } else {
      setSecondarySidebarTab(tab);
      if (isSecondarySidebarCollapsed()) {
        toggleSecondarySidebar();
      }
    }
  };

  return (
    <div className="w-12 flex flex-col items-center py-2 shrink-0 h-full">
      <ActivityBarButton
        icon={FolderIcon}
        onClick={() => handleTabClick('files')}
        active={
          secondarySidebarTab === 'files' && !isSecondarySidebarCollapsed()
        }
        title="Files"
      />
      <ActivityBarButton
        icon={GitBranchIcon}
        onClick={() => handleTabClick('git')}
        active={secondarySidebarTab === 'git' && !isSecondarySidebarCollapsed()}
        title="Git"
      />
      <Separator className="w-6 my-1" />
      <ActivityBarButton
        icon={DashboardSquare01FreeIcons}
        onClick={toggleContentPanel}
        active={!isContentPanelCollapsed()}
        title="Panels"
      />
    </div>
  );
};

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
      className={cn('hover:bg-accent', active && 'bg-accent')}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
    </Button>
  );
}
