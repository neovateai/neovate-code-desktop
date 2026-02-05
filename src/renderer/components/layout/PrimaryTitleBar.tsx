import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';
import { Button } from '../ui/button';

export function PrimaryTitleBar() {
  const multiProjectSupport = useStore((s) => s.multiProjectSupport);
  const repos = useStore((s) => s.repos);
  const selectedRepoPath = useStore((s) => s.selectedRepoPath);

  const selectedRepo = selectedRepoPath ? repos[selectedRepoPath] : null;

  if (multiProjectSupport) {
    return (
      <div
        className="relative flex h-full w-44 shrink-0 items-center justify-center "
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      ></div>
    );
  }

  return (
    <div
      className="relative flex items-center shrink-0 "
      // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <AddRepoMenu>
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
      </AddRepoMenu>
    </div>
  );
}
