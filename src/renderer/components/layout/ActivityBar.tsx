import {
  DashboardSquare01FreeIcons,
  FolderIcon,
  GitBranchIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentType } from 'react';
import { useRendererApp } from '../../core/app';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import type { SecondarySidebarTab } from '../../store/slices/ui';
import { Button, Separator } from '../ui';
import { useAppLayoutPanels } from './AppLayoutProvider';

export const ActivityBar = function ActivityBar() {
  const app = useRendererApp();
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

  // Get plugin activity bar items
  const pluginItems = app.contributions.activityBarItems ?? [];

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
      {pluginItems.map((item) => (
        <PluginActivityBarButton
          key={item.id}
          Icon={item.icon}
          onClick={() => handleTabClick(item.secondarySidebarPanelId)}
          active={
            secondarySidebarTab === item.secondarySidebarPanelId &&
            !isSecondarySidebarCollapsed()
          }
          title={item.tooltip}
        />
      ))}
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

interface PluginActivityBarButtonProps {
  Icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  title?: string;
}

function PluginActivityBarButton({
  Icon,
  onClick,
  active,
  title,
}: PluginActivityBarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      title={title}
      className={cn('hover:bg-accent', active && 'bg-accent')}
    >
      <Icon className="w-5 h-5" />
    </Button>
  );
}
