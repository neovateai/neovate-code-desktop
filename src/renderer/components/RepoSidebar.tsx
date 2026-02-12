import {
  Clock01Icon,
  FilterIcon,
  FolderAddIcon,
  FolderIcon,
  PlusSignCircleIcon,
  PlusSignIcon,
  TaskEdit01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckIcon, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { RepoDeleteDialog } from './Repo/RepoDeleteDialog';
import { SessionItem } from './Repo/SessionItem';
import { useRepoDelete } from './Repo/useRepoDelete';
import { ScrollArea } from './ui/scroll-area';
import { Button, toastManager } from './ui';
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

const DEFAULT_SESSION_LIMIT = 5;
const CHRONOLOGICAL_SESSION_LIMIT = 50;

// ─── PinnedSessionList ──────────────────────────────────────────────

/** Encode a (workspaceId, sessionId) pair as a single string key */
const encodePairKey = (workspaceId: string, sessionId: string) =>
  `${workspaceId}\0${sessionId}`;

/** Decode a pair key back into { workspaceId, sessionId } */
const decodePairKey = (key: string) => {
  const idx = key.indexOf('\0');
  return { workspaceId: key.slice(0, idx), sessionId: key.slice(idx + 1) };
};

const PinnedSessionList = memo(function PinnedSessionList() {
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);

  // Derive string[] keys — useShallow compares strings by value (primitives),
  // so this avoids the infinite-loop that new objects cause.
  const pinnedKeys = useStore(
    useShallow((state) => {
      const keys: string[] = [];
      for (const [workspaceId, workspaceSessions] of Object.entries(
        state.sessions,
      )) {
        if (!state.workspaces[workspaceId]) continue;
        for (const session of workspaceSessions) {
          if (state.pinnedSessions.includes(session.sessionId)) {
            keys.push(encodePairKey(workspaceId, session.sessionId));
          }
        }
      }
      return keys;
    }),
  );

  const pinnedItems = useMemo(
    () => pinnedKeys.map(decodePairKey),
    [pinnedKeys],
  );

  if (pinnedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 px-2 pb-2">
      {pinnedItems.map(({ sessionId, workspaceId }) => (
        <SessionItem
          key={sessionId}
          sessionId={sessionId}
          workspaceId={workspaceId}
          isPinned
          sortBy={sidebarSortBy}
        />
      ))}
    </div>
  );
});

// ─── ChronologicalSessionList ───────────────────────────────────────

const ChronologicalSessionList = memo(function ChronologicalSessionList() {
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);

  // Derive sorted string[] keys — useShallow compares strings by value.
  const sortedKeys = useStore(
    useShallow((state) => {
      const items: { key: string; sortKey: number }[] = [];
      for (const [workspaceId, workspaceSessions] of Object.entries(
        state.sessions,
      )) {
        if (!state.workspaces[workspaceId]) continue;
        for (const session of workspaceSessions) {
          if (state.pinnedSessions.includes(session.sessionId)) continue;
          items.push({
            key: encodePairKey(workspaceId, session.sessionId),
            sortKey:
              state.sidebarSortBy === 'created'
                ? session.created
                : session.modified,
          });
        }
      }
      items.sort((a, b) => b.sortKey - a.sortKey);
      return items.map((item) => item.key);
    }),
  );

  const sortedItems = useMemo(
    () => sortedKeys.map(decodePairKey),
    [sortedKeys],
  );

  const showAllThreshold = CHRONOLOGICAL_SESSION_LIMIT;
  const hasHidden = sortedItems.length > showAllThreshold;

  // Use local state for show all toggle
  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll
    ? sortedItems
    : sortedItems.slice(0, showAllThreshold);
  const hiddenCount = sortedItems.length - showAllThreshold;

  return (
    <div className="space-y-1">
      {visibleItems.map(({ sessionId, workspaceId }) => (
        <SessionItem
          key={sessionId}
          sessionId={sessionId}
          workspaceId={workspaceId}
          sortBy={sidebarSortBy}
        />
      ))}
      {hasHidden && hiddenCount > 0 && (
        <button
          className="px-3 py-1 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
});

// ─── RepoSessionList ────────────────────────────────────────────────

interface RepoSessionListProps {
  workspaceId: string;
}

const RepoSessionList = memo(function RepoSessionList({
  workspaceId,
}: RepoSessionListProps) {
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);

  const isExpanded = useStore(
    (state) => state.expandedSessionGroups[workspaceId] ?? false,
  );

  const actions = useStore(
    useShallow((state) => ({
      selectWorkspace: state.selectWorkspace,
      createOrSelectEmptySession: state.createOrSelectEmptySession,
      toggleSessionGroupExpanded: state.toggleSessionGroupExpanded,
    })),
  );

  // Derive sorted session IDs for this workspace, excluding pinned
  const sortedSessionIds = useStore(
    useShallow((state) => {
      const workspaceSessions = state.sessions[workspaceId] || [];
      return workspaceSessions
        .filter((s) => !state.pinnedSessions.includes(s.sessionId))
        .slice()
        .sort((a, b) => {
          if (state.sidebarSortBy === 'created') {
            return b.created - a.created;
          }
          return b.modified - a.modified;
        })
        .map((s) => s.sessionId);
    }),
  );

  const visibleIds = isExpanded
    ? sortedSessionIds
    : sortedSessionIds.slice(0, DEFAULT_SESSION_LIMIT);
  const hiddenCount = sortedSessionIds.length - DEFAULT_SESSION_LIMIT;

  return (
    <div className="space-y-1">
      <div>
        {multiProjectSupport ? null : (
          <Button
            className="mb-3 mt-2 w-full"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              actions.selectWorkspace(workspaceId);
              actions.createOrSelectEmptySession(workspaceId);
            }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.5} />
            <span>New Chat</span>
          </Button>
        )}

        {visibleIds.map((sessionId) => (
          <SessionItem
            key={sessionId}
            sessionId={sessionId}
            workspaceId={workspaceId}
            sortBy={sidebarSortBy}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            className="px-3 py-1 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleSessionGroupExpanded(workspaceId);
            }}
          >
            {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
});

// ─── SidebarTitleBar ────────────────────────────────────────────────

const SidebarTitleBar = memo(function SidebarTitleBar() {
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const sidebarOrganize = useStore((state) => state.sidebarOrganize);
  const sidebarSortBy = useStore((state) => state.sidebarSortBy);

  const actions = useStore(
    useShallow((state) => ({
      setSidebarOrganize: state.setSidebarOrganize,
      setSidebarSortBy: state.setSidebarSortBy,
      request: state.request,
      addRepo: state.addRepo,
      addWorkspace: state.addWorkspace,
      selectWorkspace: state.selectWorkspace,
    })),
  );

  if (!multiProjectSupport) {
    return null;
  }

  const handleOpenProject = async () => {
    let loadingToastId: string | undefined;

    const closeLoadingToast = () => {
      if (loadingToastId) {
        toastManager.close(loadingToastId);
        loadingToastId = undefined;
      }
    };

    try {
      const electron = window.electron;
      if (!electron?.selectDirectory) {
        console.error('Directory selection is not available');
        return;
      }
      const selectedPath = await electron.selectDirectory();

      if (!selectedPath) {
        return;
      }

      // Use getState() to check repos at call time — no subscription needed
      if (useStore.getState().repos[selectedPath]) {
        toastManager.add({
          title: 'Repository already exists',
          description: `The repository at ${selectedPath} is already added.`,
          type: 'error',
        });
        return;
      }

      loadingToastId = toastManager.add({
        title: 'Adding repository',
        description: 'Loading repository information...',
        type: 'loading',
      });

      const response = await actions.request('project.getRepoInfo', {
        cwd: selectedPath,
      });

      if (response.success && response.data?.repoData) {
        const repoData = response.data.repoData;

        actions.addRepo(repoData);

        try {
          const workspacesResponse = await actions.request(
            'project.workspaces.list',
            { cwd: selectedPath },
          );

          if (
            workspacesResponse.success &&
            workspacesResponse.data?.workspaces
          ) {
            const workspaces = workspacesResponse.data.workspaces;
            for (const workspace of workspaces) {
              actions.addWorkspace(workspace);
            }
            if (workspaces.length > 0) {
              actions.selectWorkspace(workspaces[0].id);
            }
          } else if (!workspacesResponse.success) {
            console.warn(
              'Failed to fetch workspaces:',
              workspacesResponse.error || 'Unknown error',
            );
          }
        } catch (workspaceError) {
          console.warn('Error fetching workspaces:', workspaceError);
        }

        closeLoadingToast();

        toastManager.add({
          title: 'Repository added',
          description: `Successfully added ${repoData.name}`,
          type: 'success',
        });
      } else {
        closeLoadingToast();

        const errorMessage = response.error || 'Invalid response from server';
        toastManager.add({
          title: 'Failed to add repository',
          description: errorMessage,
          type: 'error',
        });
      }
    } catch (error) {
      closeLoadingToast();

      const errorMessage =
        error instanceof Error ? error.message : 'Could not connect to server';

      toastManager.add({
        title: 'Failed to add repository',
        description: errorMessage,
        type: 'error',
      });
    }
  };

  const handleOrganizeChange = (value: string) => {
    actions.setSidebarOrganize(value as 'byProject' | 'chronological');
  };

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
              <MenuItem onClick={() => actions.setSidebarSortBy('created')}>
                <HugeiconsIcon
                  icon={PlusSignCircleIcon}
                  size={14}
                  strokeWidth={1.5}
                />
                <span className="flex-1">Created</span>
                {sidebarSortBy === 'created' && <CheckIcon size={14} />}
              </MenuItem>
              <MenuItem onClick={() => actions.setSidebarSortBy('updated')}>
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
});

// ─── RepoSidebar ────────────────────────────────────────────────────

const SidebarHeader = memo(function Header() {
  return null;
});

const SidebarFooter = memo(function Footer() {
  return null;
});

const RepoSidebarInner = memo(function RepoSidebar() {
  const openRepos = useStore((state) => state.openRepoAccordions);
  const setOpenRepoAccordions = useStore(
    (state) => state.setOpenRepoAccordions,
  );
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const sidebarOrganize = useStore((state) => state.sidebarOrganize);
  const selectedRepoPath = useStore((state) => state.selectedRepoPath);
  const developerMode = useStore((state) => state.developerMode);

  const actions = useStore(
    useShallow((state) => ({
      selectWorkspace: state.selectWorkspace,
      createOrSelectEmptySession: state.createOrSelectEmptySession,
    })),
  );

  const {
    deleteDialogOpen: repoDeleteDialogOpen,
    repoToDelete: repoToDeleteInfo,
    handleDeleteRepoClick,
    handleConfirmDelete: handleRepoConfirmDelete,
    handleCancelDelete: handleRepoCancelDelete,
  } = useRepoDelete();

  // Derive the display repo list — returns actual store objects (stable refs)
  // so useShallow can compare elements by reference.
  const displayRepos = useStore(
    useShallow((state) => {
      const repoList = Object.values(state.repos);
      return state.multiProjectSupport
        ? repoList
        : repoList.filter((repo) => repo.path === state.selectedRepoPath);
    }),
  );

  const repoCount = useStore((state) => Object.keys(state.repos).length);

  return (
    <div className="h-full flex flex-col">
      <PinnedSessionList />
      <SidebarTitleBar />

      {developerMode && (
        <div className="mb-2 mx-2 px-3 py-2 rounded-md text-xs font-mono bg-muted border border-border text-muted-foreground">
          <div>
            multiProjectSupport: {multiProjectSupport ? 'true' : 'false'}
          </div>
          <div>repoList count: {repoCount}</div>
          <div>filtered repos: {displayRepos.length}</div>
        </div>
      )}

      <ScrollArea
        className="flex-1 p-2 pt-0 **:data-[slot=scroll-area-scrollbar]:hidden"
        scrollFade
      >
        {repoCount === 0 ? (
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
          <ChronologicalSessionList />
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
                          actions.selectWorkspace(workspaceId);
                          actions.createOrSelectEmptySession(workspaceId);
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
                  {repo.workspaceIds[0] && (
                    <RepoSessionList workspaceId={repo.workspaceIds[0]} />
                  )}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          displayRepos.map((repo) =>
            repo.workspaceIds[0] ? (
              <RepoSessionList
                key={repo.path}
                workspaceId={repo.workspaceIds[0]}
              />
            ) : null,
          )
        )}
      </ScrollArea>

      <div className="mt-auto">
        <SidebarFooter />
      </div>

      <RepoDeleteDialog
        open={repoDeleteDialogOpen}
        onOpenChange={handleRepoCancelDelete}
        repo={repoToDeleteInfo}
        onConfirm={handleRepoConfirmDelete}
      />
    </div>
  );
});

export const RepoSidebar = Object.assign(RepoSidebarInner, {
  Header: SidebarHeader,
  Footer: SidebarFooter,
});
