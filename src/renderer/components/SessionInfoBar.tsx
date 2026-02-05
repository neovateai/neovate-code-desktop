import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';
import { SessionActionsMenu } from './SessionActionsMenu';
import { Separator as UISeparator } from './ui/separator';

interface SessionInfoBarProps {
  showSeparator?: boolean;
  showProjectName?: boolean;
}

export function SessionInfoBar({
  showSeparator = false,
  showProjectName = true,
}: SessionInfoBarProps) {
  const selectedSessionId = useStore((s) => s.selectedSessionId);
  const selectedWorkspaceId = useStore((s) => s.selectedWorkspaceId);
  const sessions = useStore((s) => s.sessions);
  const workspaces = useStore((s) => s.workspaces);
  const updateSession = useStore((s) => s.updateSession);
  const request = useStore((s) => s.request);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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

  if (!activeSession || !selectedWorkspaceId || !selectedSessionId) {
    return null;
  }

  return (
    <>
      {showSeparator && (
        <UISeparator orientation="vertical" className="h-4 mx-2 bg-border" />
      )}
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
          <span className="text-foreground truncate max-w-80 font-medium">
            {activeSession.summary || 'New Chat'}
          </span>
        )}
        {showProjectName && (
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleOpenInFinder}
            title="Open in Finder"
          >
            <FolderOpen size={14} strokeWidth={1.5} />
            <span className="truncate max-w-32">{projectName}</span>
          </button>
        )}
        <SessionActionsMenu
          sessionId={selectedSessionId}
          workspaceId={selectedWorkspaceId}
          onRenameStart={handleStartRename}
        />
      </div>
    </>
  );
}
