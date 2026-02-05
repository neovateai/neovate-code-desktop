import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store';
import { AddRepoMenu } from '../AddRepoMenu';
import { SessionActionsMenu } from '../SessionActionsMenu';
import { Button } from '../ui/button';
import { Separator as UISeparator } from '../ui/separator';

export function PrimaryTitleBar() {
  const multiProjectSupport = useStore((s) => s.multiProjectSupport);
  const repos = useStore((s) => s.repos);
  const selectedRepoPath = useStore((s) => s.selectedRepoPath);
  const selectedSessionId = useStore((s) => s.selectedSessionId);
  const selectedWorkspaceId = useStore((s) => s.selectedWorkspaceId);
  const sessions = useStore((s) => s.sessions);
  const workspaces = useStore((s) => s.workspaces);
  const updateSession = useStore((s) => s.updateSession);
  const request = useStore((s) => s.request);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const selectedRepo = selectedRepoPath ? repos[selectedRepoPath] : null;
  const workspace = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]
    : null;
  const activeSession =
    selectedWorkspaceId && selectedSessionId
      ? sessions[selectedWorkspaceId]?.find(
          (s) => s.sessionId === selectedSessionId,
        )
      : null;
  const projectName = workspace?.repoPath.split('/').pop();

  const handleOpenInFinder = async () => {
    if (workspace?.worktreePath) {
      await request('utils.open', {
        cwd: workspace.worktreePath,
        app: 'finder',
      });
    }
  };

  const handleStartRename = () => {
    if (activeSession) {
      setRenameValue(activeSession.summary || 'New Chat');
      setIsRenaming(true);
    }
  };

  const handleSaveRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && selectedWorkspaceId && selectedSessionId && workspace) {
      try {
        await request('session.config.setSummary', {
          cwd: workspace.worktreePath,
          sessionId: selectedSessionId,
          summary: trimmed,
        });
        updateSession(selectedWorkspaceId, selectedSessionId, {
          summary: trimmed,
        });
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
    setIsRenaming(false);
  };

  if (multiProjectSupport) {
    return (
      <div
        className="relative flex h-full shrink-0 items-center gap-1"
        // @ts-expect-error - WebkitAppRegion is a valid CSS property for Electron
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {activeSession && selectedWorkspaceId && selectedSessionId && (
          <div className="flex items-center gap-1 text-sm">
            {isRenaming ? (
              <input
                className="bg-transparent border border-primary rounded px-1 py-0.5 text-sm outline-none max-w-40"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <span className="text-foreground truncate max-w-80">
                {activeSession.summary || 'New Chat'}
              </span>
            )}
            <span className="text-muted-foreground">/</span>
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleOpenInFinder}
              title="Open in Finder"
            >
              <FolderOpen size={14} strokeWidth={1.5} />
              <span className="truncate max-w-32">{projectName}</span>
            </button>
            <SessionActionsMenu
              sessionId={selectedSessionId}
              workspaceId={selectedWorkspaceId}
              onRenameStart={handleStartRename}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center shrink-0 gap-1"
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

      {activeSession && selectedWorkspaceId && selectedSessionId && (
        <>
          <UISeparator orientation="vertical" className="h-4 mx-2 bg-border" />
          <div className="flex items-center gap-1 text-sm">
            {isRenaming ? (
              <input
                className="bg-transparent border border-primary rounded px-1 py-0.5 text-sm outline-none max-w-40"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <span className="text-foreground truncate max-w-80">
                {activeSession.summary || 'New Chat'}
              </span>
            )}
            <span className="text-muted-foreground">/</span>
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleOpenInFinder}
              title="Open in Finder"
            >
              <FolderOpen size={14} strokeWidth={1.5} />
              <span className="truncate max-w-32">{projectName}</span>
            </button>
            <SessionActionsMenu
              sessionId={selectedSessionId}
              workspaceId={selectedWorkspaceId}
              onRenameStart={handleStartRename}
            />
          </div>
        </>
      )}
    </div>
  );
}
