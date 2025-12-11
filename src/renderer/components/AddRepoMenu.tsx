import { CloudIcon, FolderIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';
import type { ElectronAPI } from '../../shared/types';
import { useStore } from '../store';
import { CloneInput } from './CloneInput';
import { CloneProgressToast } from './CloneProgressToast';
import { toastManager } from './ui';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from './ui/menu';

interface AddRepoMenuProps {
  children: React.ReactElement;
}

export const AddRepoMenu = ({ children }: AddRepoMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = React.useState(false);
  const [isCloning, setIsCloning] = React.useState(false);
  const [cloneProgress, setCloneProgress] = React.useState(0);
  const [currentTaskId, setCurrentTaskId] = React.useState<string | null>(null);
  const { request, addRepo, addWorkspace, repos } = useStore();

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
      const electron = window.electron as ElectronAPI | undefined;
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
            // Add all workspaces to the store
            for (const workspace of workspacesResponse.data.workspaces) {
              addWorkspace(workspace);
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
    setCloneDialogOpen(true);
  };

  const handleCloneStart = (progress: number, taskId: string) => {
    setIsCloning(true);
    setCloneProgress(progress);
    setCurrentTaskId(taskId);
  };

  const handleCloneComplete = () => {
    setIsCloning(false);
    setCloneProgress(0);
    setCurrentTaskId(null);
  };

  const handleCancelClone = async () => {
    if (!currentTaskId) return;

    try {
      await request('git.clone.cancel', { taskId: currentTaskId });

      // Note: Don't reset state here - let CloneInput's finally block handle it
      // This avoids double state reset and ensures proper cleanup order
    } catch (error) {
      console.error('Failed to cancel clone:', error);
      // Even if cancel fails, the CloneInput will handle state cleanup
    }
  };

  return (
    <>
      <Menu open={open} onOpenChange={setOpen}>
        <MenuTrigger>{children}</MenuTrigger>
        <MenuPopup side="top" align="start">
          <MenuItem onClick={handleOpenProject} disabled={isLoading}>
            <HugeiconsIcon icon={FolderIcon} size={16} strokeWidth={1.5} />
            <span>Open Project</span>
          </MenuItem>
          <MenuItem onClick={handleCloneFromURL} disabled={isLoading}>
            <HugeiconsIcon icon={CloudIcon} size={16} strokeWidth={1.5} />
            <span>Clone from URL</span>
          </MenuItem>
        </MenuPopup>
      </Menu>

      <CloneInput
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        onCloneStart={handleCloneStart}
        onCloneComplete={handleCloneComplete}
      />

      {/* Global clone progress toast - stays visible even when dialog closes */}
      <CloneProgressToast
        visible={isCloning}
        progress={cloneProgress}
        taskId={currentTaskId || undefined}
        onCancel={handleCancelClone}
      />
    </>
  );
};
