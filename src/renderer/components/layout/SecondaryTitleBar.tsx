import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useStore } from '../../store';
import { Button } from '../ui/button';

export function SecondaryTitleBar() {
  const setShowSettings = useStore((s) => s.setShowSettings);

  return (
    <div
      className="flex items-center flex-1"
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Drag region fills available space */}
      <div className="flex-1" />

      {/* Settings button */}
      <div
        className="flex items-center"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
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
