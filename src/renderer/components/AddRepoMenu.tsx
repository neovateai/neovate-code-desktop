import {
  CloudIcon,
  Delete02Icon,
  FolderIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckIcon } from 'lucide-react';
import React from 'react';
import { useStore } from '../store';
import { RepoDeleteDialog } from './Repo/RepoDeleteDialog';
import { useRepoDelete } from './Repo/useRepoDelete';
import { toastManager } from './ui';
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from './ui/menu';

interface AddRepoMenuProps {
  children: React.ReactElement<Record<string, unknown>>;
}

export const AddRepoMenu = ({ children }: AddRepoMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const {
    request,
    addRepo,
    addWorkspace,
    repos,
    selectWorkspace,
    selectedWorkspaceId,
    multiProjectSupport,
    workspaces,
  } = useStore();

  const {
    deleteDialogOpen,
    repoToDelete,
    handleDeleteRepoClick,
    handleConfirmDelete,
    handleCancelDelete,
  } = useRepoDelete();

  const handleOpenProject = async () => {
    // Prevent multiple simultaneous operations
    if (isLoading) {
      return;
    }

    setOpen(false);

    let loadingToastId: string | undefined;

    // Helper function to close loading toast
    const closeLoadingToast = () => {
      if (loadingToastId) {
        toastManager.close(loadingToastId);
        loadingToastId = undefined;
      }
    };

    try {
      // Open native directory picker
      const electron = window.electron;
      if (!electron?.selectDirectory) {
        console.error('Directory selection is not available');
        return;
      }
      const selectedPath = await electron.selectDirectory();

      // User cancelled selection
      if (!selectedPath) {
        return;
      }

      // Check if repository already exists
      if (repos[selectedPath]) {
        toastManager.add({
          title: 'Repository already exists',
          description: `The repository at ${selectedPath} is already added.`,
          type: 'error',
        });
        return;
      }

      // Show loading state
      setIsLoading(true);
      loadingToastId = toastManager.add({
        title: 'Adding repository',
        description: 'Loading repository information...',
        type: 'loading',
      });

      // Request repository info from the backend
      const response = await request('project.getRepoInfo', {
        cwd: selectedPath,
      });

      if (response.success && response.data?.repoData) {
        const repoData = response.data.repoData;

        // Add the repository to the store
        addRepo(repoData);

        // Fetch and add workspaces for this repository
        try {
          const workspacesResponse = await request('project.workspaces.list', {
            cwd: selectedPath,
          });

          if (
            workspacesResponse.success &&
            workspacesResponse.data?.workspaces
          ) {
            const workspaces = workspacesResponse.data.workspaces;
            for (const workspace of workspaces) {
              addWorkspace(workspace);
            }
            if (workspaces.length > 0) {
              selectWorkspace(workspaces[0].id);
            }
          } else if (!workspacesResponse.success) {
            // Log warning if workspace fetch fails, but continue
            console.warn(
              'Failed to fetch workspaces:',
              workspacesResponse.error || 'Unknown error',
            );
          }
        } catch (workspaceError) {
          // Log error but don't fail the repo addition
          console.warn('Error fetching workspaces:', workspaceError);
        }

        closeLoadingToast();

        // Show success toast
        toastManager.add({
          title: 'Repository added',
          description: `Successfully added ${repoData.name}`,
          type: 'success',
        });
      } else {
        closeLoadingToast();

        // Handle API error
        const errorMessage = response.error || 'Invalid response from server';
        toastManager.add({
          title: 'Failed to add repository',
          description: errorMessage,
          type: 'error',
        });
      }
    } catch (error) {
      closeLoadingToast();

      // Handle network or other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Could not connect to server';

      toastManager.add({
        title: 'Failed to add repository',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneFromURL = () => {
    setOpen(false);
    toastManager.add({
      type: 'info',
      title: 'Clone from URL',
      description: 'Clone from URL functionality is not implemented yet',
    });
  };

  const repoEntries = Object.entries(repos);

  const handleSwitchWorkspace = (workspaceId: string) => {
    selectWorkspace(workspaceId);
    setOpen(false);
  };

  const getFirstWorkspaceId = (repoPath: string) => {
    return Object.values(workspaces).find((w) => w.repoPath === repoPath)?.id;
  };

  const isCurrentRepo = (repoPath: string) => {
    const currentWorkspace = selectedWorkspaceId
      ? workspaces[selectedWorkspaceId]
      : null;
    return currentWorkspace?.repoPath === repoPath;
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger render={children} />
      <MenuPopup side="top" align="start">
        <MenuItem onClick={handleOpenProject} disabled={isLoading}>
          <HugeiconsIcon icon={FolderIcon} size={16} strokeWidth={1.5} />
          <span>Open Project</span>
        </MenuItem>
        <MenuItem onClick={handleCloneFromURL} disabled={isLoading}>
          <HugeiconsIcon icon={CloudIcon} size={16} strokeWidth={1.5} />
          <span>Clone from URL</span>
        </MenuItem>

        {!multiProjectSupport && repoEntries.length > 0 && (
          <>
            <MenuSeparator />
            {repoEntries.map(([path, repo]) => {
              const firstWorkspaceId = getFirstWorkspaceId(path);
              if (!firstWorkspaceId) return null;

              const isCurrent = isCurrentRepo(path);

              return (
                <MenuItem
                  key={path}
                  onClick={() => handleSwitchWorkspace(firstWorkspaceId)}
                  className="group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{repo.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {path}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="p-1">
                      <CheckIcon size={14} />
                    </div>
                  )}
                  {!isCurrent && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      onClick={(e) => handleDeleteRepoClick(e, path, repo.name)}
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        size={14}
                        strokeWidth={1.5}
                        className="text-red-500"
                      />
                    </button>
                  )}
                </MenuItem>
              );
            })}
          </>
        )}

        <RepoDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={handleCancelDelete}
          repo={repoToDelete}
          onConfirm={() => handleConfirmDelete(() => setOpen(false))}
        />
      </MenuPopup>
    </Menu>
  );
};
