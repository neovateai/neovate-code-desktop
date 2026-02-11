import { MoreHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';
import { useStore } from '../store';
import { useSessionDelete } from './Session/useSessionDelete';
import { Button, toastManager } from './ui';
import { ContextMenuItem, ContextMenuSeparator } from './ui/context-menu';
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from './ui/menu';

interface SessionActionsMenuProps {
  sessionId: string;
  workspaceId: string;
  trigger?: ReactElement;
  onRenameStart?: () => void;
  onDeleted?: () => void;
}

export function SessionActionsMenu({
  sessionId,
  workspaceId,
  trigger,
  onRenameStart,
  onDeleted,
}: SessionActionsMenuProps) {
  const workspaces = useStore((state) => state.workspaces);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const request = useStore((state) => state.request);
  const { deleteSession } = useSessionDelete();

  const workspace = workspaces[workspaceId];
  const isPinned = pinnedSessions.includes(sessionId);

  const handleDelete = () => {
    deleteSession(workspaceId, sessionId, onDeleted);
  };

  const handleCopyWorkingDirectory = () => {
    if (workspace) {
      navigator.clipboard.writeText(workspace.worktreePath);
      toastManager.add({ title: 'Copied working directory' });
    }
  };

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    toastManager.add({ title: 'Copied session ID' });
  };

  const handleOpenLogFile = async () => {
    if (workspace) {
      const logFilePath = `${workspace.globalProjectDir}/${sessionId}.jsonl`;
      await request('utils.open', { cwd: logFilePath, app: 'finder' });
    }
  };

  return (
    <Menu>
      <MenuTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal size={16} strokeWidth={1.5} />
            </Button>
          )
        }
      />
      <MenuPopup side="bottom" align="end" className="text-xs">
        {onRenameStart && <MenuItem onClick={onRenameStart}>Rename</MenuItem>}
        <MenuItem onClick={() => togglePinSession(sessionId)}>
          {isPinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem className="text-red-500" onClick={handleDelete}>
          Delete
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={handleCopyWorkingDirectory}>
          Copy working directory
        </MenuItem>
        <MenuItem onClick={handleCopySessionId}>Copy session ID</MenuItem>
        <MenuItem onClick={handleOpenLogFile}>Open session log</MenuItem>
      </MenuPopup>
    </Menu>
  );
}

interface SessionActionsContextMenuItemsProps {
  sessionId: string;
  workspaceId: string;
  onRenameStart?: () => void;
  onDeleted?: () => void;
}

export function SessionActionsContextMenuItems({
  sessionId,
  workspaceId,
  onRenameStart,
  onDeleted,
}: SessionActionsContextMenuItemsProps) {
  const workspaces = useStore((state) => state.workspaces);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const request = useStore((state) => state.request);
  const { deleteSession } = useSessionDelete();

  const workspace = workspaces[workspaceId];
  const isPinned = pinnedSessions.includes(sessionId);

  const handleDelete = () => {
    deleteSession(workspaceId, sessionId, onDeleted);
  };

  const handleCopyWorkingDirectory = () => {
    if (workspace) {
      navigator.clipboard.writeText(workspace.worktreePath);
      toastManager.add({ title: 'Copied working directory' });
    }
  };

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    toastManager.add({ title: 'Copied session ID' });
  };

  const handleOpenLogFile = async () => {
    if (workspace) {
      const logFilePath = `${workspace.globalProjectDir}/${sessionId}.jsonl`;
      await request('utils.open', { cwd: logFilePath, app: 'finder' });
    }
  };

  return (
    <>
      {onRenameStart && (
        <ContextMenuItem onClick={onRenameStart}>Rename</ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => togglePinSession(sessionId)}>
        {isPinned ? 'Unpin' : 'Pin'}
      </ContextMenuItem>
      <ContextMenuItem className="text-red-500" onClick={handleDelete}>
        Delete
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleCopyWorkingDirectory}>
        Copy working directory
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCopySessionId}>
        Copy session ID
      </ContextMenuItem>
      <ContextMenuItem onClick={handleOpenLogFile}>
        Open session log
      </ContextMenuItem>
    </>
  );
}
