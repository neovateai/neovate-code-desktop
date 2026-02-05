import {
  Clock01Icon,
  Comment01Icon,
  FilterIcon,
  FolderAddIcon,
  FolderIcon,
  HelpCircleIcon,
  PlusSignCircleIcon,
  PlusSignIcon,
  TaskEdit01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  CheckIcon,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { memo, useState } from 'react';
import type { RepoData, SessionData } from '../client/types/entities';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { RepoDeleteDialog } from './Repo/RepoDeleteDialog';
import { useRepoDelete } from './Repo/useRepoDelete';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './ui/context-menu';
import { ScrollArea } from './ui/scroll-area';
import { Spinner } from './ui/spinner';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  Button,
  toastManager,
} from './ui';
import { Accordion, AccordionItem, AccordionPanel } from './ui/accordion';
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from './ui/menu';
import { RepoAccordionTrigger } from './Repo/AccordionTrigger';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';

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

const DEFAULT_SESSION_LIMIT = 5;
const CHRONOLOGICAL_SESSION_LIMIT = 50;

interface PinnedSessionListProps {
  onDeleteSession: (
    sessionId: string,
    workspaceId: string,
    summary: string,
  ) => void;
}

const PinnedSessionList = ({ onDeleteSession }: PinnedSessionListProps) => {
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const sessionProcessing = useStore((state) => state.sessionProcessing);
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectSession = useStore((state) => state.selectSession);
  const updateSession = useStore((state) => state.updateSession);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const request = useStore((state) => state.request);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const pinnedSessionsData = Object.entries(sessions).flatMap(
    ([workspaceId, workspaceSessions]) => {
      const workspace = workspaces[workspaceId];
      if (!workspace) return [];
      return workspaceSessions
        .filter((session) => pinnedSessions.includes(session.sessionId))
        .map((session) => ({
          session,
          workspaceId,
        }));
    },
  );

  const startRename = (sessionId: string, currentSummary: string) => {
    setEditingSessionId(sessionId);
    setEditingValue(currentSummary || 'New Chat');
  };

  const saveRename = async (workspaceId: string, sessionId: string) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const workspace = workspaces[workspaceId];
      if (workspace) {
        try {
          await request('session.config.setSummary', {
            cwd: workspace.worktreePath,
            sessionId,
            summary: trimmed,
          });
          updateSession(workspaceId, sessionId, { summary: trimmed });
        } catch (error) {
          console.error('Failed to rename session:', error);
        }
      }
    }
    setEditingSessionId(null);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
  };

  if (pinnedSessionsData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 px-2 pb-2">
      {pinnedSessionsData.map(({ session, workspaceId }) => {
        const isSessionSelected = selectedSessionId === session.sessionId;
        const isEditing = editingSessionId === session.sessionId;
        const displaySummary = session.summary || 'New Chat';
        const processing = sessionProcessing[session.sessionId] || {
          status: 'idle',
        };
        const isProcessing = processing.status === 'processing';
        const isAwaitingApproval = processing.status === 'awaiting_approval';
        const isFailed = processing.status === 'failed';

        return (
          <ContextMenu key={session.sessionId}>
            <ContextMenuTrigger
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors group',
                isSessionSelected
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                isFailed && 'text-destructive-foreground',
              )}
              onClick={() => {
                selectWorkspace(workspaceId);
                selectSession(session.sessionId);
              }}
              onMouseLeave={() => setConfirmingDeleteId(null)}
            >
              <button
                className="hidden group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinSession(session.sessionId);
                }}
              >
                <PinOff size={14} strokeWidth={1.5} />
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
                ) : (
                  <Pin size={14} strokeWidth={1.5} />
                )}
              </div>
              {isEditing ? (
                <input
                  className="flex-1 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => saveRename(workspaceId, session.sessionId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveRename(workspaceId, session.sessionId);
                    } else if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <span className="flex-1 text-sm truncate">
                  {displaySummary}
                </span>
              )}
              <span className="text-sm text-muted-foreground group-hover:hidden">
                {formatRelativeTime(
                  sidebarSortBy === 'created'
                    ? session.created
                    : session.modified,
                )}
              </span>
              {confirmingDeleteId === session.sessionId ? (
                <button
                  className="text-xs text-destructive bg-muted rounded px-2 py-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(
                      session.sessionId,
                      workspaceId,
                      session.summary || 'New Chat',
                    );
                    setConfirmingDeleteId(null);
                  }}
                >
                  Confirm
                </button>
              ) : (
                <button
                  className="hidden group-hover:block rounded hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDeleteId(session.sessionId);
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
            </ContextMenuTrigger>
            <ContextMenuPopup>
              <ContextMenuItem
                onClick={() =>
                  startRename(session.sessionId, session.summary || '')
                }
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => togglePinSession(session.sessionId)}
              >
                Unpin
              </ContextMenuItem>
              <ContextMenuItem
                className="text-red-500"
                onClick={() =>
                  onDeleteSession(
                    session.sessionId,
                    workspaceId,
                    session.summary || 'New Chat',
                  )
                }
              >
                Delete
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  const workspace = workspaces[workspaceId];
                  if (workspace) {
                    navigator.clipboard.writeText(workspace.worktreePath);
                    toastManager.add({ title: 'Copied working directory' });
                  }
                }}
              >
                Copy working directory
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(session.sessionId);
                  toastManager.add({ title: 'Copied session ID' });
                }}
              >
                Copy session ID
              </ContextMenuItem>
            </ContextMenuPopup>
          </ContextMenu>
        );
      })}
    </div>
  );
};

interface ChronologicalSessionListProps {
  onDeleteSession: (
    sessionId: string,
    workspaceId: string,
    summary: string,
  ) => void;
}

const ChronologicalSessionList = ({
  onDeleteSession,
}: ChronologicalSessionListProps) => {
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const sessionProcessing = useStore((state) => state.sessionProcessing);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectSession = useStore((state) => state.selectSession);
  const updateSession = useStore((state) => state.updateSession);
  const togglePinSession = useStore((state) => state.togglePinSession);
  const request = useStore((state) => state.request);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const flatSessions = Object.entries(sessions).flatMap(
    ([workspaceId, workspaceSessions]) => {
      const workspace = workspaces[workspaceId];
      if (!workspace) return [];
      return workspaceSessions
        .filter((session) => !pinnedSessions.includes(session.sessionId))
        .map((session) => ({
          session,
          workspaceId,
        }));
    },
  );

  const sortedSessions = flatSessions.slice().sort((a, b) => {
    if (sidebarSortBy === 'created') {
      return b.session.created - a.session.created;
    }
    return b.session.modified - a.session.modified;
  });

  const visibleSessions = showAll
    ? sortedSessions
    : sortedSessions.slice(0, CHRONOLOGICAL_SESSION_LIMIT);
  const hiddenCount = sortedSessions.length - CHRONOLOGICAL_SESSION_LIMIT;

  const startRename = (sessionId: string, currentSummary: string) => {
    setEditingSessionId(sessionId);
    setEditingValue(currentSummary || 'New Chat');
  };

  const saveRename = async (workspaceId: string, sessionId: string) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const workspace = workspaces[workspaceId];
      if (workspace) {
        try {
          await request('session.config.setSummary', {
            cwd: workspace.worktreePath,
            sessionId,
            summary: trimmed,
          });
          updateSession(workspaceId, sessionId, { summary: trimmed });
        } catch (error) {
          console.error('Failed to rename session:', error);
        }
      }
    }
    setEditingSessionId(null);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
  };

  return (
    <div className="space-y-1">
      {visibleSessions.map(({ session, workspaceId }) => {
        const isSessionSelected = selectedSessionId === session.sessionId;
        const isEditing = editingSessionId === session.sessionId;
        const displaySummary = session.summary || 'New Chat';
        const processing = sessionProcessing[session.sessionId] || {
          status: 'idle',
        };
        const isProcessing = processing.status === 'processing';
        const isAwaitingApproval = processing.status === 'awaiting_approval';
        const isFailed = processing.status === 'failed';

        return (
          <ContextMenu key={session.sessionId}>
            <ContextMenuTrigger
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors group',
                isSessionSelected
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                isFailed && 'text-destructive-foreground',
              )}
              onClick={() => {
                selectWorkspace(workspaceId);
                selectSession(session.sessionId);
              }}
              onMouseLeave={() => setConfirmingDeleteId(null)}
            >
              <button
                className="hidden group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinSession(session.sessionId);
                }}
              >
                <Pin size={14} strokeWidth={1.5} />
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
                ) : (
                  <HugeiconsIcon
                    icon={Comment01Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                )}
              </div>
              {isEditing ? (
                <input
                  className="flex-1 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => saveRename(workspaceId, session.sessionId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveRename(workspaceId, session.sessionId);
                    } else if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <span className="flex-1 text-sm truncate">
                  {displaySummary}
                </span>
              )}
              <span className="text-sm text-muted-foreground group-hover:hidden">
                {formatRelativeTime(session.modified)}
              </span>
              {confirmingDeleteId === session.sessionId ? (
                <button
                  className="text-xs text-destructive bg-muted rounded px-2 py-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(
                      session.sessionId,
                      workspaceId,
                      session.summary || 'New Chat',
                    );
                    setConfirmingDeleteId(null);
                  }}
                >
                  Confirm
                </button>
              ) : (
                <button
                  className="hidden group-hover:block rounded hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDeleteId(session.sessionId);
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
            </ContextMenuTrigger>
            <ContextMenuPopup>
              <ContextMenuItem
                onClick={() =>
                  startRename(session.sessionId, session.summary || '')
                }
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => togglePinSession(session.sessionId)}
              >
                Pin
              </ContextMenuItem>
              <ContextMenuItem
                className="text-red-500"
                onClick={() =>
                  onDeleteSession(
                    session.sessionId,
                    workspaceId,
                    session.summary || 'New Chat',
                  )
                }
              >
                Delete
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  const workspace = workspaces[workspaceId];
                  if (workspace) {
                    navigator.clipboard.writeText(workspace.worktreePath);
                    toastManager.add({ title: 'Copied working directory' });
                  }
                }}
              >
                Copy working directory
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(session.sessionId);
                  toastManager.add({ title: 'Copied session ID' });
                }}
              >
                Copy session ID
              </ContextMenuItem>
            </ContextMenuPopup>
          </ContextMenu>
        );
      })}
      {hiddenCount > 0 && (
        <button
          className="px-3 py-1 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};

interface RepoSessionListProps {
  repo: RepoData;
  onDeleteSession: (
    sessionId: string,
    workspaceId: string,
    summary: string,
  ) => void;
}

const RepoSessionList = ({ repo, onDeleteSession }: RepoSessionListProps) => {
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const pinnedSessions = useStore((state) => state.pinnedSessions);
  const expandedSessions = useStore((state) => state.expandedSessionGroups);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const sessionProcessing = useStore((state) => state.sessionProcessing);
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectSession = useStore((state) => state.selectSession);
  const createOrSelectEmptySession = useStore(
    (state) => state.createOrSelectEmptySession,
  );
  const toggleSessionGroupExpanded = useStore(
    (state) => state.toggleSessionGroupExpanded,
  );
  const togglePinSession = useStore((state) => state.togglePinSession);
  const updateSession = useStore((state) => state.updateSession);
  const request = useStore((state) => state.request);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const startRename = (sessionId: string, currentSummary: string) => {
    setEditingSessionId(sessionId);
    setEditingValue(currentSummary || 'New Chat');
  };

  const saveRename = async (workspaceId: string, sessionId: string) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const workspace = workspaces[workspaceId];
      if (workspace) {
        try {
          await request('session.config.setSummary', {
            cwd: workspace.worktreePath,
            sessionId,
            summary: trimmed,
          });
          updateSession(workspaceId, sessionId, { summary: trimmed });
        } catch (error) {
          console.error('Failed to rename session:', error);
        }
      }
    }
    setEditingSessionId(null);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
  };

  return (
    <div className="space-y-1">
      {repo.workspaceIds.slice(0, 1).map((workspaceId) => {
        const workspace = workspaces[workspaceId];
        if (!workspace) return null;

        const workspaceSessions = (sessions[workspaceId] || [])
          .filter((s) => !pinnedSessions.includes(s.sessionId))
          .slice()
          .sort((a, b) => {
            if (sidebarSortBy === 'created') {
              return b.created - a.created;
            }
            return b.modified - a.modified;
          });

        const expandKey = `${workspaceId}`;
        const isExpanded = expandedSessions[expandKey] ?? false;
        const visibleSessions = isExpanded
          ? workspaceSessions
          : workspaceSessions.slice(0, DEFAULT_SESSION_LIMIT);
        const hiddenCount = workspaceSessions.length - DEFAULT_SESSION_LIMIT;

        return (
          <div key={workspaceId}>
            <div>
              {multiProjectSupport ? null : (
                <Button
                  className="mb-3 mt-2 w-full"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectWorkspace(workspaceId);
                    createOrSelectEmptySession(workspaceId);
                  }}
                >
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    size={14}
                    strokeWidth={1.5}
                  />
                  <span>New Chat</span>
                </Button>
              )}

              {visibleSessions.map((session) => {
                const isSessionSelected =
                  selectedSessionId === session.sessionId;
                const isEditing = editingSessionId === session.sessionId;
                const displaySummary = session.summary || 'New Chat';
                const processing = sessionProcessing[session.sessionId] || {
                  status: 'idle',
                };
                const isProcessing = processing.status === 'processing';
                const isAwaitingApproval =
                  processing.status === 'awaiting_approval';
                const isFailed = processing.status === 'failed';
                const isPinned = pinnedSessions.includes(session.sessionId);

                return (
                  <ContextMenu key={session.sessionId}>
                    <ContextMenuTrigger
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors group',
                        isSessionSelected
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        isFailed && 'text-destructive-foreground',
                      )}
                      onClick={() => {
                        selectWorkspace(workspaceId);
                        selectSession(session.sessionId);
                      }}
                      onMouseLeave={() => setConfirmingDeleteId(null)}
                    >
                      <button
                        className="hidden group-hover:block"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinSession(session.sessionId);
                        }}
                      >
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
                        ) : (
                          <HugeiconsIcon
                            icon={Comment01Icon}
                            size={14}
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      {isEditing ? (
                        <input
                          className="flex-1 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() =>
                            saveRename(workspaceId, session.sessionId)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveRename(workspaceId, session.sessionId);
                            } else if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                        />
                      ) : (
                        <span className="flex-1 text-sm truncate">
                          {displaySummary}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground group-hover:hidden">
                        {formatRelativeTime(
                          sidebarSortBy === 'created'
                            ? session.created
                            : session.modified,
                        )}
                      </span>
                      {confirmingDeleteId === session.sessionId ? (
                        <button
                          className="text-xs text-destructive bg-muted rounded px-2 py-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(
                              session.sessionId,
                              workspaceId,
                              session.summary || 'New Chat',
                            );
                            setConfirmingDeleteId(null);
                          }}
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          className="hidden group-hover:block rounded hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteId(session.sessionId);
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </ContextMenuTrigger>
                    <ContextMenuPopup>
                      <ContextMenuItem
                        onClick={() =>
                          startRename(session.sessionId, session.summary || '')
                        }
                      >
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => togglePinSession(session.sessionId)}
                      >
                        {isPinned ? 'Unpin' : 'Pin'}
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-red-500"
                        onClick={() =>
                          onDeleteSession(
                            session.sessionId,
                            workspaceId,
                            session.summary || 'New Chat',
                          )
                        }
                      >
                        Delete
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(workspace.worktreePath);
                          toastManager.add({
                            title: 'Copied working directory',
                          });
                        }}
                      >
                        Copy working directory
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(session.sessionId);
                          toastManager.add({ title: 'Copied session ID' });
                        }}
                      >
                        Copy session ID
                      </ContextMenuItem>
                    </ContextMenuPopup>
                  </ContextMenu>
                );
              })}

              {hiddenCount > 0 && (
                <button
                  className="px-3 py-1 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSessionGroupExpanded(expandKey);
                  }}
                >
                  {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SidebarTitleBar = () => {
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const sidebarOrganize = useStore((state) => state.sidebarOrganize);
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);
  const setSidebarOrganize = useStore((state) => state.setSidebarOrganize);
  const setSidebarSortBy = useStore((state) => state.setSidebarSortBy);

  const handleOpenProject = async () => {
    const electron = window.electron;
    if (!electron?.selectDirectory) {
      return;
    }
    await electron.selectDirectory();
  };

  const handleOrganizeChange = (value: string) => {
    setSidebarOrganize(value as 'byProject' | 'chronological');
  };

  if (!multiProjectSupport) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-sm font-medium text-foreground">Sessions</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleOpenProject}
          title="Add project"
        >
          <HugeiconsIcon icon={FolderAddIcon} size={16} strokeWidth={1.5} />
        </Button>
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                title="Filter"
              >
                <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={1.5} />
              </Button>
            }
          />
          <MenuPopup side="bottom" align="end" className="text-xs">
            <MenuGroup>
              <MenuGroupLabel>Organize</MenuGroupLabel>
              <MenuItem onClick={() => handleOrganizeChange('byProject')}>
                <HugeiconsIcon icon={FolderIcon} size={14} strokeWidth={1.5} />
                <span className="flex-1">By project</span>
                {sidebarOrganize === 'byProject' && <CheckIcon size={12} />}
              </MenuItem>
              {multiProjectSupport && (
                <MenuItem onClick={() => handleOrganizeChange('chronological')}>
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                  <span className="flex-1">Chronological list</span>
                  {sidebarOrganize === 'chronological' && (
                    <CheckIcon size={12} />
                  )}
                </MenuItem>
              )}
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Sort by</MenuGroupLabel>
              <MenuItem onClick={() => setSidebarSortBy('created')}>
                <HugeiconsIcon
                  icon={PlusSignCircleIcon}
                  size={14}
                  strokeWidth={1.5}
                />
                <span className="flex-1">Created</span>
                {sidebarSortBy === 'created' && <CheckIcon size={14} />}
              </MenuItem>
              <MenuItem onClick={() => setSidebarSortBy('updated')}>
                <HugeiconsIcon
                  icon={TaskEdit01Icon}
                  size={12}
                  strokeWidth={1.5}
                />
                <span className="flex-1">Updated</span>
                {sidebarSortBy === 'updated' && <CheckIcon size={12} />}
              </MenuItem>
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </div>
    </div>
  );
};

export const RepoSidebar = () => {
  const openRepos = useStore((state) => state.openRepoAccordions);
  const setOpenRepoAccordions = useStore(
    (state) => state.setOpenRepoAccordions,
  );
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const selectSession = useStore((state) => state.selectSession);
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const sidebarOrganize = useStore((state) => state.sidebarOrganize);
  const repos = useStore((state) => state.repos);
  const selectedRepoPath = useStore((state) => state.selectedRepoPath);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const removeSession = useStore((state) => state.removeSession);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const createOrSelectEmptySession = useStore(
    (state) => state.createOrSelectEmptySession,
  );
  const request = useStore((state) => state.request);
  const developerMode = useStore((state) => state.developerMode);

  const handleDeleteSession = async (
    sessionId: string,
    workspaceId: string,
  ) => {
    const workspace = workspaces[workspaceId];
    if (!workspace) return;

    const session = (sessions[workspaceId] || []).find(
      (s) => s.sessionId === sessionId,
    );
    const isLocalOnly = !session || session.messageCount === 0;

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
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const {
    deleteDialogOpen: repoDeleteDialogOpen,
    repoToDelete: repoToDeleteInfo,
    handleDeleteRepoClick,
    handleConfirmDelete: handleRepoConfirmDelete,
    handleCancelDelete: handleRepoCancelDelete,
  } = useRepoDelete();

  const repoList = Object.values(repos);
  const displayRepos = multiProjectSupport
    ? repoList
    : repoList.filter((repo) => repo.path === selectedRepoPath);

  return (
    <div className="h-full flex flex-col pt-8 relative">
      <PinnedSessionList onDeleteSession={handleDeleteSession} />
      <SidebarTitleBar />

      {developerMode && (
        <div className="mb-2 mx-2 px-3 py-2 rounded-md text-xs font-mono bg-muted border border-border text-muted-foreground">
          <div>
            multiProjectSupport: {multiProjectSupport ? 'true' : 'false'}
          </div>
          <div>repoList count: {repoList.length}</div>
          <div>filtered repos: {displayRepos.length}</div>
        </div>
      )}

      <ScrollArea
        className="flex-1 p-2 pt-0 **:data-[slot=scroll-area-scrollbar]:hidden"
        scrollFade
      >
        {repoList.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={FolderIcon}
                size={48}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No repositories</EmptyTitle>
              <EmptyDescription>
                Click the + icon below to add your first repository
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : sidebarOrganize === 'chronological' && multiProjectSupport ? (
          <ChronologicalSessionList onDeleteSession={handleDeleteSession} />
        ) : multiProjectSupport ? (
          <Accordion
            value={openRepos}
            onValueChange={setOpenRepoAccordions}
            multiple
          >
            {displayRepos.map((repo) => (
              <AccordionItem key={repo.path} value={repo.path} className="mb-1">
                <RepoAccordionTrigger className="flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors text-muted-foreground hover:bg-accent hover:text-foreground group w-full max-w-full">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <HugeiconsIcon
                      icon={FolderIcon}
                      size={18}
                      strokeWidth={1.5}
                      className="flex-shrink-0 group-hover:hidden"
                    />
                    {openRepos.includes(repo.path) ? (
                      <ChevronDown
                        size={18}
                        strokeWidth={1.5}
                        className="flex-shrink-0 hidden group-hover:block"
                      />
                    ) : (
                      <ChevronRight
                        size={18}
                        strokeWidth={1.5}
                        className="flex-shrink-0 hidden group-hover:block"
                      />
                    )}
                    <div className="font-medium text-sm truncate flex-1">
                      {repo.name}
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                      onClick={(e) =>
                        handleDeleteRepoClick(e, repo.path, repo.name)
                      }
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        const workspaceId = repo.workspaceIds[0];
                        if (workspaceId) {
                          selectWorkspace(workspaceId);
                          createOrSelectEmptySession(workspaceId);
                        }
                      }}
                    >
                      <HugeiconsIcon
                        icon={PlusSignIcon}
                        size={14}
                        strokeWidth={1.5}
                      />
                    </button>
                  </div>
                </RepoAccordionTrigger>
                <AccordionPanel>
                  <RepoSessionList
                    repo={repo}
                    onDeleteSession={handleDeleteSession}
                  />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          displayRepos.map((repo) => (
            <RepoSessionList
              key={repo.path}
              repo={repo}
              onDeleteSession={handleDeleteSession}
            />
          ))
        )}
      </ScrollArea>

      <div className="mt-auto">
        <RepoSidebar.Footer />
      </div>

      <RepoDeleteDialog
        open={repoDeleteDialogOpen}
        onOpenChange={handleRepoCancelDelete}
        repo={repoToDeleteInfo}
        onConfirm={handleRepoConfirmDelete}
      />
    </div>
  );
};

RepoSidebar.Header = memo(function Header() {
  return null;
});

RepoSidebar.Footer = memo(function Footer() {
  return null;
});
