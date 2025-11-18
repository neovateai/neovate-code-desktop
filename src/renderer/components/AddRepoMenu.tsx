import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderIcon, CloudIcon } from '@hugeicons/core-free-icons';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from './ui/menu';
import { useStore } from '../store';
import { toastManager } from './ui';
import type { RepoData, WorkspaceData } from '../client/types/entities';
import type { ElectronAPI } from '../../shared/types';

interface AddRepoMenuProps {
  children: React.ReactElement;
}

interface GetRepoInfoResponse {
  success: boolean;
  data?: { repoData: RepoData };
  error?: string;
}

interface GetWorkspacesInfoResponse {
  success: boolean;
  data?: { workspaces: WorkspaceData[] };
  error?: string;
}

export const AddRepoMenu = ({ children }: AddRepoMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const { request, addRepo, addWorkspace, repos } = useStore();

  const handleOpenProject = async () => {
    setOpen(false);

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

      // Request repository info from the backend
      const response = await request<{ cwd: string }, GetRepoInfoResponse>(
        'project.getRepoInfo',
        { cwd: selectedPath },
      );

      if (response.success && response.data?.repoData) {
        const repoData = response.data.repoData;

        // Add the repository to the store
        addRepo(repoData);

        // Fetch and add workspaces for this repository
        try {
          const workspacesResponse = await request<
            { cwd: string },
            GetWorkspacesInfoResponse
          >('project.getWorkspacesInfo', { cwd: selectedPath });

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

        // Show success toast after workspace processing
        toastManager.add({
          title: 'Repository added',
          description: `Successfully added ${repoData.name}`,
          type: 'success',
        });
      } else {
        // Handle API error
        const errorMessage = response.error || 'Invalid response from server';
        toastManager.add({
          title: 'Failed to add repository',
          description: errorMessage,
          type: 'error',
        });
      }
    } catch (error) {
      // Handle network or other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Could not connect to server';

      toastManager.add({
        title: 'Failed to add repository',
        description: errorMessage,
        type: 'error',
      });
    }
  };

  const handleCloneFromURL = () => {
    setOpen(false);
    alert('Not implemented');
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger>{children}</MenuTrigger>
      <MenuPopup side="top" align="start">
        <MenuItem onClick={handleOpenProject}>
          <HugeiconsIcon icon={FolderIcon} size={16} strokeWidth={1.5} />
          <span>Open Project</span>
        </MenuItem>
        <MenuItem onClick={handleCloneFromURL}>
          <HugeiconsIcon icon={CloudIcon} size={16} strokeWidth={1.5} />
          <span>Clone from URL</span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
};
