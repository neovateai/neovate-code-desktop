import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRendererApp } from '../../core/app';
import { useStore } from '../../store';
import { OpenAppButton } from '../OpenAppButton';
import { Button } from '../ui/button';
import { PluginTitlebarItem } from './PluginTitlebarItem';

export function SecondaryTitleBar() {
  const app = useRendererApp();
  const setShowSettings = useStore((s) => s.setShowSettings);
  const selectedRepoPath = useStore((s) => s.selectedRepoPath);
  const pluginItems = app.contributions.flatMap(
    (c) => c.secondaryTitlebarItems ?? [],
  );

  return (
    <div
      className="flex items-center flex-1"
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Drag region fills available space */}
      <div className="flex-1" />

      <div
        className="flex items-center gap-1"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {pluginItems?.map((item) => (
          <PluginTitlebarItem key={item.id} item={item} app={app} />
        ))}
        {selectedRepoPath && <OpenAppButton cwd={selectedRepoPath} />}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
