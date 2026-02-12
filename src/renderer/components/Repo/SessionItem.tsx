import { Comment01Icon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import { SessionActionsContextMenuItems } from '../SessionActionsMenu';
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { Spinner } from '../ui/spinner';

function formatRelativeTime(timestamp: number): string {
  const distance = formatDistanceToNowStrict(timestamp, { addSuffix: false });
  return distance
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}

interface SessionItemProps {
  sessionId: string;
  workspaceId: string;
  /** Whether to show as pinned (PinOff icon on hover) or unpinned (Pin icon on hover) */
  isPinned?: boolean;
  /** Which timestamp to display: 'created' | 'updated' */
  sortBy: 'created' | 'updated';
}

export const SessionItem = memo(function SessionItem({
  sessionId,
  workspaceId,
  isPinned = false,
  sortBy,
}: SessionItemProps) {
  // Per-item store subscriptions — only this item re-renders when its data changes
  const session = useStore(
    useCallback(
      (state) =>
        state.sessions[workspaceId]?.find((s) => s.sessionId === sessionId) ??
        null,
      [workspaceId, sessionId],
    ),
  );

  const isSelected = useStore(
    useCallback((state) => state.selectedSessionId === sessionId, [sessionId]),
  );

  const processingStatus = useStore(
    useCallback(
      (state) => state.sessionProcessing[sessionId]?.status ?? 'idle',
      [sessionId],
    ),
  );

  const actions = useStore(
    useShallow((state) => ({
      selectWorkspace: state.selectWorkspace,
      selectSession: state.selectSession,
      togglePinSession: state.togglePinSession,
      updateSession: state.updateSession,
      request: state.request,
    })),
  );

  // Per-item local state for editing and delete confirmation
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!session) return null;

  const displaySummary = session.summary || 'New Chat';
  const isProcessing = processingStatus === 'processing';
  const isAwaitingApproval = processingStatus === 'awaiting_approval';
  const isFailed = processingStatus === 'failed';

  const handleClick = () => {
    actions.selectWorkspace(workspaceId);
    actions.selectSession(sessionId);
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.togglePinSession(sessionId);
  };

  const handleStartRename = () => {
    setIsEditing(true);
    setEditingValue(session.summary || 'New Chat');
  };

  const handleSaveRename = async () => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const workspace = useStore.getState().workspaces[workspaceId];
      if (workspace) {
        try {
          await actions.request('session.config.setSummary', {
            cwd: workspace.worktreePath,
            sessionId,
            summary: trimmed,
          });
          actions.updateSession(workspaceId, sessionId, { summary: trimmed });
        } catch (error) {
          console.error('Failed to rename session:', error);
        }
      }
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setIsEditing(false);
  };

  const handleStartDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const state = useStore.getState();
    const workspace = state.workspaces[workspaceId];
    const sessionData = state.sessions[workspaceId]?.find(
      (s) => s.sessionId === sessionId,
    );
    if (!workspace || !sessionData) return;

    const isLocalOnly = sessionData.messageCount === 0;
    try {
      if (!isLocalOnly) {
        const result = await actions.request('sessions.remove', {
          cwd: workspace.worktreePath,
          sessionId,
        });
        if (!result.success) {
          console.error('Failed to delete session:', result.error);
          return;
        }
      }
      state.removeSession(workspaceId, sessionId);
      if (state.selectedSessionId === sessionId) {
        const remaining = (state.sessions[workspaceId] || [])
          .filter((s) => s.sessionId !== sessionId)
          .sort((a, b) => b.modified - a.modified);
        state.selectSession(
          remaining.length > 0 ? remaining[0].sessionId : null,
        );
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
    setIsConfirming(false);
  };

  const handleMouseLeave = () => {
    if (isConfirming) setIsConfirming(false);
  };

  const timestamp = sortBy === 'created' ? session.created : session.modified;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors group',
          isSelected
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          isFailed && 'text-destructive-foreground',
        )}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      >
        <button className="hidden group-hover:block" onClick={handlePinToggle}>
          {isPinned ? (
            <PinOff size={14} strokeWidth={1.5} />
          ) : (
            <Pin size={14} strokeWidth={1.5} />
          )}
        </button>
        <div className="group-hover:hidden">
          {isProcessing ? (
            <Spinner className="size-3.5" />
          ) : isAwaitingApproval ? (
            <HugeiconsIcon
              icon={HelpCircleIcon}
              size={14}
              strokeWidth={1.5}
              className="text-warning-foreground"
            />
          ) : isPinned ? (
            <Pin size={14} strokeWidth={1.5} />
          ) : (
            <HugeiconsIcon icon={Comment01Icon} size={14} strokeWidth={1.5} />
          )}
        </div>
        {isEditing ? (
          <input
            className="flex-1 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveRename();
              } else if (e.key === 'Escape') {
                handleCancelRename();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{displaySummary}</span>
        )}
        <span
          className={cn(
            'text-sm text-muted-foreground group-hover:hidden',
            isConfirming && 'hidden',
          )}
        >
          {formatRelativeTime(timestamp)}
        </span>
        {isConfirming ? (
          <button
            className="text-xs text-destructive cursor-pointer rounded bg-muted px-2 py-0.5 hover:bg-destructive/10 transition-colors"
            onClick={handleConfirmDelete}
          >
            Confirm
          </button>
        ) : (
          <button
            className="hidden group-hover:block cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleStartDelete}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuPopup>
        <SessionActionsContextMenuItems
          sessionId={sessionId}
          workspaceId={workspaceId}
          onRenameStart={handleStartRename}
        />
      </ContextMenuPopup>
    </ContextMenu>
  );
});
