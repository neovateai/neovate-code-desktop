import { MoreHorizontal } from 'lucide-react';
import { useCallback, type ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  const isPinned = useStore(
    useCallback(
      (state) => state.pinnedSessions.includes(sessionId),
      [sessionId],
    ),
  );

  const actions = useStore(
    useShallow((state) => ({
      togglePinSession: state.togglePinSession,
      request: state.request,
    })),
  );

  const { deleteSession } = useSessionDelete();

  const handleDelete = () => {
    deleteSession(workspaceId, sessionId, onDeleted);
  };

  const handleCopyWorkingDirectory = () => {
    const workspace = useStore.getState().workspaces[workspaceId];
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
    const workspace = useStore.getState().workspaces[workspaceId];
    if (workspace) {
      const logFilePath = `${workspace.globalProjectDir}/${sessionId}.jsonl`;
      await actions.request('utils.open', { cwd: logFilePath, app: 'finder' });
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
        <MenuItem onClick={() => actions.togglePinSession(sessionId)}>
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
  const isPinned = useStore(
    useCallback(
      (state) => state.pinnedSessions.includes(sessionId),
      [sessionId],
    ),
  );

  const actions = useStore(
    useShallow((state) => ({
      togglePinSession: state.togglePinSession,
      request: state.request,
    })),
  );

  const { deleteSession } = useSessionDelete();

  const handleDelete = () => {
    deleteSession(workspaceId, sessionId, onDeleted);
  };

  const handleCopyWorkingDirectory = () => {
    const workspace = useStore.getState().workspaces[workspaceId];
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
    const workspace = useStore.getState().workspaces[workspaceId];
    if (workspace) {
      const logFilePath = `${workspace.globalProjectDir}/${sessionId}.jsonl`;
      await actions.request('utils.open', { cwd: logFilePath, app: 'finder' });
    }
  };

  return (
    <>
      {onRenameStart && (
        <ContextMenuItem onClick={onRenameStart}>Rename</ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => actions.togglePinSession(sessionId)}>
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
