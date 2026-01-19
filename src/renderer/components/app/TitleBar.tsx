import {
  PanelLeftIcon,
  PanelRightIcon,
  PlusSignIcon,
  Settings01Icon,
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';
import { Button } from '../ui/button';
import { Separator as UISeparator } from '../ui/separator';
import { useAppLayoutPanels } from '../layout/AppLayoutProvider';

export function TitleBar() {
  const {
    isPrimarySidebarCollapsed,
    isSecondarySidebarCollapsed,
    togglePrimarySidebar,
    toggleSecondarySidebar,
  } = useAppLayoutPanels();
  const setShowSettings = useStore((s) => s.setShowSettings);

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
        <UISeparator
          orientation="vertical"
          className="h-4 mx-1 bg-(--border-elevated)"
        />
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
