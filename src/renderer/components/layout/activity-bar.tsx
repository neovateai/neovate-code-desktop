import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderIcon,
  GitBranchIcon,
  ComputerTerminal01Icon,
} from '@hugeicons/core-free-icons';
import {
  useAppStore,
  selectSecondarySidebarCollapsed,
  selectSecondarySidebarTab,
  selectSetSecondarySidebarCollapsed,
  selectTerminalPanelCollapsed,
} from '../../store/app';
import { cn } from '../../lib/utils';
import { Button, Separator } from '../ui';

export const ActivityBar = memo(function ActivityBar() {
  const secondarySidebarCollapsed = useAppStore(
    selectSecondarySidebarCollapsed,
  );
  const secondarySidebarTab = useAppStore(selectSecondarySidebarTab);
  const setSecondarySidebarTab = useAppStore((s) => s.setSecondarySidebarTab);
  const setSecondarySidebarCollapsed = useAppStore(
    selectSetSecondarySidebarCollapsed,
  );
  const terminalPanelCollapsed = useAppStore(selectTerminalPanelCollapsed);
  const toggleTerminalPanel = useAppStore((s) => s.toggleTerminalPanel);

  const handleTabClick = (tab: 'files' | 'git') => {
    if (secondarySidebarTab === tab && !secondarySidebarCollapsed) {
      setSecondarySidebarCollapsed(true);
    } else {
      setSecondarySidebarTab(tab);
      setSecondarySidebarCollapsed(false);
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
        onClick={toggleTerminalPanel}
        active={!terminalPanelCollapsed}
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
