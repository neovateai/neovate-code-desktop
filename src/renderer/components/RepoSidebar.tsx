import { useState, useEffect, memo, type MouseEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderIcon,
  GitBranchIcon,
  PlusSignIcon,
  DeleteIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  DatabaseIcon,
  CloudIcon,
  Comment01Icon,
  HelpCircleIcon,
} from '@hugeicons/core-free-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import type { RepoData } from '../client/types/entities';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Spinner } from './ui/spinner';
import { ScrollArea } from './ui/scroll-area';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
} from './ui/context-menu';

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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from './ui/accordion';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from './ui/alert-dialog';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from './ui/empty';
import { Button } from './ui/button';

export const RepoSidebar = ({
  repos,
  selectedWorkspaceId,
  onSelectWorkspace,
}: {
  repos: RepoData[];
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  onSelectRepo: (path: string | null) => void;
  onSelectWorkspace: (id: string | null) => void;
}) => {
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedRepoForDialog, setSelectedRepoForDialog] =
    useState<RepoData | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [sessionAlertOpen, setSessionAlertOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    sessionId: string;
    workspaceId: string;
    summary: string;
  } | null>(null);

  const handleRepoInfoClick = (repo: RepoData, e: MouseEvent) => {
    e.stopPropagation();
    setAlertDialogOpen(false); // Ensure alert is closed
    setSelectedRepoForDialog(repo);
    setDialogOpen(true);
  };

  const handleDeleteRepo = () => {
    setAlertDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedRepoForDialog) {
      deleteRepo(selectedRepoForDialog.path);
      setAlertDialogOpen(false);
      setDialogOpen(false);
      setSelectedRepoForDialog(null);
    }
  };

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

  return (
    <div className="h-full flex flex-col">
      {/* <RepoSidebar.Header /> */}

      <ScrollArea
        className="flex-1 p-2 pt-0 **:data-[slot=scroll-area-scrollbar]:hidden"
        scrollFade
      >
        {repos.length === 0 ? (
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
            {repos.map((repo) => (
              <AccordionItem key={repo.path} value={repo.path}>
                <AccordionTrigger className="px-3 py-2">
                  <div className="flex items-center gap-2 flex-1">
                    <HugeiconsIcon
                      icon={FolderIcon}
                      size={18}
                      strokeWidth={1.5}
                    />
                    <span className="font-medium text-sm">{repo.name}</span>
                    <span
                      className="ml-auto p-1 rounded"
                      onClick={(e) => handleRepoInfoClick(repo, e)}
                    >
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        size={16}
                        strokeWidth={1.5}
                      />
                    </span>
                  </div>
                </AccordionTrigger>

                <AccordionPanel>
                  <div className="space-y-1">
                    {repo.workspaceIds.slice(0, 1).map((workspaceId) => {
                      const workspace = workspaces[workspaceId];
                      if (!workspace) return null;

                      // Get sessions for this workspace, sorted by modified (newest first)
                      const workspaceSessions = (sessions[workspaceId] || [])
                        .slice()
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
                            <button
                              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded transition-colors w-full text-left text-muted-foreground hover:bg-accent hover:text-foreground"
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
                              <span className="text-xs font-medium">
                                New Chat
                              </span>
                            </button>

                            {visibleSessions.map((session) => {
                              const isSessionSelected =
                                selectedSessionId === session.sessionId;
                              const isEditing =
                                editingSessionId === session.sessionId;
                              const displaySummary =
                                session.summary && session.summary.length > 20
                                  ? `${session.summary.slice(0, 20)}…`
                                  : session.summary || 'New Chat';

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
                                      'flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded transition-colors',
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
                                        className="flex-1 text-xs bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
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
                                      <span className="flex-1 text-xs truncate">
                                        {displaySummary}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
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
                                className="px-3 py-1 text-xs cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setAlertDialogOpen(false);
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Repository Information</DialogTitle>
            <DialogDescription>{selectedRepoForDialog?.name}</DialogDescription>
          </DialogHeader>

          <div className="px-6 space-y-3 text-sm">
            <InfoRow
              icon={FolderIcon}
              label="Path"
              value={selectedRepoForDialog?.path || ''}
            />
            <InfoRow
              icon={GitBranchIcon}
              label="Workspaces"
              value={`${
                selectedRepoForDialog?.workspaceIds.length || 0
              } worktrees`}
            />
            <InfoRow
              icon={CloudIcon}
              label="Remote URL"
              value="https://github.com/user/repo.git"
            />
            <InfoRow icon={ClockIcon} label="Last Commit" value="2 hours ago" />
            <InfoRow
              icon={DatabaseIcon}
              label="Repository Size"
              value="12.5 MB"
            />
            <InfoRow
              icon={CalendarIcon}
              label="Created"
              value={new Date().toLocaleDateString()}
            />
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteRepo}
              className="gap-2"
            >
              <HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
              Delete Repository
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Repository?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRepoForDialog &&
                `This will permanently delete '${selectedRepoForDialog.name}' and its ${selectedRepoForDialog.workspaceIds.length} workspace(s). This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline">Cancel</Button>
            </AlertDialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="gap-2"
            >
              <HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog open={sessionAlertOpen} onOpenChange={setSessionAlertOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{sessionToDelete?.summary}". This
              action cannot be undone.
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
              <HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.5}
        className="text-muted-foreground mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium mb-0.5 text-muted-foreground">
          {label}
        </div>
        <div className="text-sm break-all text-foreground">{value}</div>
      </div>
    </div>
  );
}

RepoSidebar.Header = memo(function Header() {
  return null;
});

RepoSidebar.Footer = memo(function Footer() {
  return null;
});
