import {
  ArrowDown01Icon,
  FolderAddIcon,
  PanelLeftIcon,
  PanelRightIcon,
  Settings01Icon,
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';
import { Button } from '../ui/button';
import { Separator as UISeparator } from '../ui/separator';
import { useAppLayoutPanels } from './AppLayoutProvider';

export function TitleBar() {
  const {
    isPrimarySidebarCollapsed,
    isSecondarySidebarCollapsed,
    togglePrimarySidebar,
    toggleSecondarySidebar,
  } = useAppLayoutPanels();
  const setShowSettings = useStore((s) => s.setShowSettings);
  const multiProjectSupport = useStore((s) => s.multiProjectSupport);
  const repos = useStore((s) => s.repos);
  const selectedRepoPath = useStore((s) => s.selectedRepoPath);

  const selectedRepo = selectedRepoPath ? repos[selectedRepoPath] : null;

  return (
    <>
      {/* Traffic lights area - leave space for macOS buttons */}
      <div className="w-[68px] shrink-0" />

      {/* Interactive buttons - non-draggable */}
      <div
        className="flex items-center gap-1"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <TitleBarButton
          icon={
            isPrimarySidebarCollapsed() ? PanelLeftIcon : ViewSidebarLeftIcon
          }
          onClick={togglePrimarySidebar}
          title={isPrimarySidebarCollapsed() ? 'Show sidebar' : 'Hide sidebar'}
        />
        <AddRepoMenu>
          {multiProjectSupport ? null : (
            <Button
              variant="ghost"
              className="h-8 px-2 text-sm font-medium"
              title={selectedRepo ? selectedRepo.name : 'Select project'}
            >
              <span className="max-w-60 truncate">
                {selectedRepo ? selectedRepo.name : 'No project'}
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                strokeWidth={1.5}
                className="ml-1"
              />
            </Button>
          )}
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
        <UISeparator orientation="vertical" className="h-4 mx-1 bg-border" />
        <TitleBarButton
          icon={
            isSecondarySidebarCollapsed()
              ? PanelRightIcon
              : ViewSidebarRightIcon
          }
          onClick={toggleSecondarySidebar}
          title={
            isSecondarySidebarCollapsed() ? 'Show sidebar' : 'Hide sidebar'
          }
        />
      </div>
    </>
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
