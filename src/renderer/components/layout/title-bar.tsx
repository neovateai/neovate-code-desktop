import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
  PanelLeftIcon,
  PanelRightIcon,
  Comment01Icon,
  GitBranchIcon,
  Settings01Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';

export const TitleBar = memo(function TitleBar() {
  const primarySidebarCollapsed = useStore((s) => s.primarySidebarCollapsed);
  const togglePrimarySidebar = useStore((s) => s.togglePrimarySidebar);
  const secondarySidebarCollapsed = useStore(
    (s) => s.secondarySidebarCollapsed,
  );
  const toggleSecondarySidebar = useStore((s) => s.toggleSecondarySidebar);
  const setShowSettings = useStore((s) => s.setShowSettings);

  const selectedRepoPath = useStore((s) => s.selectedRepoPath);
  const repos = useStore((s) => s.repos);
  const selectedWorkspaceId = useStore((s) => s.selectedWorkspaceId);
  const workspaces = useStore((s) => s.workspaces);

  const selectedRepo = selectedRepoPath ? repos[selectedRepoPath] : null;
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]
    : null;

  const repoName = selectedRepo?.name || 'No repository';
  const branchName = selectedWorkspace?.branch || 'main';

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

      {/* Repo and branch info */}
      {/* <div className="flex items-center gap-2 ml-4 text-sm">
        <span style={{ color: 'var(--text-primary)' }}>{repoName}</span>
        <HugeiconsIcon
          icon={GitBranchIcon}
          size={14}
          strokeWidth={1.5}
          style={{ color: 'var(--text-tertiary)' }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>{branchName}</span>
      </div> */}

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
        <Separator
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
});

interface TitleBarButtonProps {
  icon: typeof PanelLeftIcon;
  onClick: () => void;
  title?: string;
}

function TitleBarButton({ icon, onClick, title }: TitleBarButtonProps) {
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
