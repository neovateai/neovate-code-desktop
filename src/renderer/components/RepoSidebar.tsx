import {
  Comment01Icon,
  FolderIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { type MouseEvent, memo, useEffect, useState } from 'react';
import type { RepoData } from '../client/types/entities';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { RepoDeleteDialog } from './Repo/RepoDeleteDialog';
import { useRepoDelete } from './Repo/useRepoDelete';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from './ui/context-menu';
import { ScrollArea } from './ui/scroll-area';
import { Spinner } from './ui/spinner';

// Helper function to format relative time in short format (e.g., "4m", "2h")
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

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  Button,
} from './ui';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from './ui/accordion';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';

export const RepoSidebar = () => {
  const openRepos = useStore((state) => state.openRepoAccordions);
  const setOpenRepoAccordions = useStore(
    (state) => state.setOpenRepoAccordions,
  );
  const expandedSessions = useStore((state) => state.expandedSessionGroups);
  const toggleSessionGroupExpanded = useStore(
    (state) => state.toggleSessionGroupExpanded,
  );
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const deleteRepo = useStore((state) => state.deleteRepo);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectSession = useStore((state) => state.selectSession);
  const createOrSelectEmptySession = useStore(
    (state) => state.createOrSelectEmptySession,
  );
  const sessionProcessing = useStore((state) => state.sessionProcessing);
  const messages = useStore((state) => state.messages);
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const repos = useStore((state) => state.repos);
  const selectedRepoPath = useStore((state) => state.selectedRepoPath);
  // console.log('repos,selectedRepoPath', repos, selectedRepoPath);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [sessionAlertOpen, setSessionAlertOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    sessionId: string;
    workspaceId: string;
    summary: string;
  } | null>(null);

  const {
    deleteDialogOpen: repoDeleteDialogOpen,
    repoToDelete: repoToDeleteInfo,
    handleDeleteRepoClick: handleRepoDeleteClick,
    handleConfirmDelete: handleRepoConfirmDelete,
    handleCancelDelete: handleRepoCancelDelete,
  } = useRepoDelete();

  const updateSession = useStore((state) => state.updateSession);
  const removeSession = useStore((state) => state.removeSession);
  const request = useStore((state) => state.request);

  const startRename = (sessionId: string, currentSummary: string) => {
    setEditingSessionId(sessionId);
    setEditingValue(currentSummary || 'New Chat');
  };

  const saveRename = async (workspaceId: string, sessionId: string) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const workspace = workspaces[workspaceId];
      if (workspace) {
        const cwd = workspace.worktreePath;
        try {
          await request('session.config.setSummary', {
            cwd,
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

  const handleDeleteSessionClick = (
    session: { sessionId: string; summary: string; messageCount: number },
    workspaceId: string,
  ) => {
    setSessionToDelete({
      sessionId: session.sessionId,
      workspaceId,
      summary: session.summary || 'New Chat',
    });
    setSessionAlertOpen(true);
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    const { sessionId, workspaceId } = sessionToDelete;
    const workspace = workspaces[workspaceId];
    if (!workspace) return;

    // Find the session to check if it has messages
    const session = (sessions[workspaceId] || []).find(
      (s) => s.sessionId === sessionId,
    );
    const isLocalOnly = !session || session.messageCount === 0;

    try {
      // Only call API if session has messages (persisted to backend)
      if (!isLocalOnly) {
        const result = await request('sessions.remove', {
          cwd: workspace.worktreePath,
          sessionId,
        });

        if (!result.success) {
          console.error('Failed to delete session:', result.error);
          setSessionAlertOpen(false);
          setSessionToDelete(null);
          return;
        }
      }

      // Remove from local store
      removeSession(workspaceId, sessionId);

      // Auto-select next session if this was selected
      if (selectedSessionId === sessionId) {
        const remaining = (sessions[workspaceId] || [])
          .filter((s) => s.sessionId !== sessionId)
          .sort((a, b) => b.modified - a.modified);

        if (remaining.length > 0) {
          selectSession(remaining[0].sessionId);
        } else {
          selectSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }

    setSessionAlertOpen(false);
    setSessionToDelete(null);
  };

  const repoList = Object.values(repos);

  return (
    <div className="h-full flex flex-col">
      {/* <RepoSidebar.Header /> */}

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
        ) : (
          <Accordion
            value={openRepos}
            onValueChange={setOpenRepoAccordions}
            multiple
          >
            {(multiProjectSupport
              ? repoList
              : repoList.filter((repo) => repo.path === selectedRepoPath)
            ).map((repo) => (
              <AccordionItem key={repo.path} value={repo.path}>
                {multiProjectSupport && (
                  <AccordionTrigger className="px-3 py-2 group w-full max-w-full">
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <HugeiconsIcon
                        icon={FolderIcon}
                        size={18}
                        strokeWidth={1.5}
                        className="flex-shrink-0"
                      />
                      <div className="font-medium text-sm truncate w-full">
                        {repo.name}
                      </div>
                      {/* <span
                        className="absolute ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        onClick={(e) =>
                          handleRepoDeleteClick(e, repo.path, repo.name)
                        }
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </span> */}
                    </div>
                  </AccordionTrigger>
                )}

                <AccordionPanel className={!multiProjectSupport ? 'pt-0' : ''}>
                  <div className="space-y-1">
                    {repo.workspaceIds.map((workspaceId) => {
                      const workspace = workspaces[workspaceId];
                      if (!workspace) return null;

                      // Get sessions for this workspace, sorted by modified (newest first)
                      const workspaceSessions = (sessions[workspaceId] || [])
                        .slice()
                        .filter((item) => item.messageCount > 0)
                        .sort((a, b) => b.modified - a.modified);
                      const expandKey = `${workspaceId}`;
                      const isExpanded = expandedSessions[expandKey] ?? false;
                      const visibleSessions = isExpanded
                        ? workspaceSessions
                        : workspaceSessions.slice(0, DEFAULT_SESSION_LIMIT);
                      const hiddenCount =
                        workspaceSessions.length - DEFAULT_SESSION_LIMIT;

                      return (
                        <div key={workspaceId}>
                          {/* Session list */}
                          <div>
                            {/* Create session button */}
                            {multiProjectSupport ? (
                              <button
                                className={cn(
                                  'flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded transition-colors w-full text-left mb-1 text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
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
                                <span className="text-sm">New Chat</span>
                              </button>
                            ) : (
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
                              const isEditing =
                                editingSessionId === session.sessionId;
                              const displaySummary = session.summary
                                ? session.summary
                                : 'New Chat';

                              const processing = sessionProcessing[
                                session.sessionId
                              ] || { status: 'idle' };
                              const isProcessing =
                                processing.status === 'processing';
                              const isAwaitingApproval =
                                processing.status === 'awaiting_approval';
                              const isFailed = processing.status === 'failed';
                              return (
                                <ContextMenu key={session.sessionId}>
                                  <ContextMenuTrigger
                                    className={cn(
                                      'flex items-center gap-2 px-3 py-1.5 mb-1 cursor-pointer rounded transition-colors',
                                      isSessionSelected
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                      isFailed && 'text-destructive-foreground',
                                    )}
                                    onClick={() => {
                                      selectWorkspace(workspaceId);
                                      selectSession(session.sessionId);
                                    }}
                                  >
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
                                    {isEditing ? (
                                      <input
                                        className="flex-1 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
                                        value={editingValue}
                                        onChange={(e) =>
                                          setEditingValue(e.target.value)
                                        }
                                        onBlur={() =>
                                          saveRename(
                                            workspaceId,
                                            session.sessionId,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveRename(
                                              workspaceId,
                                              session.sessionId,
                                            );
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
                                    <span className="text-sm text-muted-foreground">
                                      {formatRelativeTime(session.modified)}
                                    </span>
                                  </ContextMenuTrigger>
                                  <ContextMenuPopup>
                                    <ContextMenuItem
                                      onClick={() =>
                                        startRename(
                                          session.sessionId,
                                          session.summary || '',
                                        )
                                      }
                                    >
                                      Rename
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleDeleteSessionClick(
                                          session,
                                          workspaceId,
                                        )
                                      }
                                      className="text-red-500"
                                    >
                                      Delete
                                    </ContextMenuItem>
                                  </ContextMenuPopup>
                                </ContextMenu>
                              );
                            })}

                            {/* Show more/less toggle */}
                            {hiddenCount > 0 && (
                              <button
                                className="px-3 py-1 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSessionGroupExpanded(expandKey);
                                }}
                              >
                                {isExpanded
                                  ? 'Show less'
                                  : `Show ${hiddenCount} more`}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
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

      <AlertDialog open={sessionAlertOpen} onOpenChange={setSessionAlertOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{sessionToDelete?.summary}". This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline">Cancel</Button>
            </AlertDialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteSession}
              className="gap-2"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
};

RepoSidebar.Header = memo(function Header() {
  return null;
});

RepoSidebar.Footer = memo(function Footer() {
  return null;
});
