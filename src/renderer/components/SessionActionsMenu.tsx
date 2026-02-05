import { MoreHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';
import { useStore } from '../store';
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
  const sessions = useStore((state) => state.sessions);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const removeSession = useStore((state) => state.removeSession);
  const selectSession = useStore((state) => state.selectSession);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const request = useStore((state) => state.request);

  const workspace = workspaces[workspaceId];
  const session = sessions[workspaceId]?.find((s) => s.sessionId === sessionId);
  const isPinned = pinnedSessions.includes(sessionId);

  const handleDelete = async () => {
    if (!workspace || !session) return;

    const isLocalOnly = session.messageCount === 0;

    try {
      if (!isLocalOnly) {
        const result = await request('sessions.remove', {
          cwd: workspace.worktreePath,
          sessionId,
        });
        if (!result.success) {
          console.error('Failed to delete session:', result.error);
          return;
        }
      }

      removeSession(workspaceId, sessionId);

      if (selectedSessionId === sessionId) {
        const remaining = (sessions[workspaceId] || [])
          .filter((s) => s.sessionId !== sessionId)
          .sort((a, b) => b.modified - a.modified);
        selectSession(remaining.length > 0 ? remaining[0].sessionId : null);
      }

      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
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
  const sessions = useStore((state) => state.sessions);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const removeSession = useStore((state) => state.removeSession);
  const selectSession = useStore((state) => state.selectSession);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const request = useStore((state) => state.request);

  const workspace = workspaces[workspaceId];
  const session = sessions[workspaceId]?.find((s) => s.sessionId === sessionId);
  const isPinned = pinnedSessions.includes(sessionId);

  const handleDelete = async () => {
    if (!workspace || !session) return;

    const isLocalOnly = session.messageCount === 0;

    try {
      if (!isLocalOnly) {
        const result = await request('sessions.remove', {
          cwd: workspace.worktreePath,
          sessionId,
        });
        if (!result.success) {
          console.error('Failed to delete session:', result.error);
          return;
        }
      }

      removeSession(workspaceId, sessionId);

      if (selectedSessionId === sessionId) {
        const remaining = (sessions[workspaceId] || [])
          .filter((s) => s.sessionId !== sessionId)
          .sort((a, b) => b.modified - a.modified);
        selectSession(remaining.length > 0 ? remaining[0].sessionId : null);
      }

      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
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
    </>
  );
}
