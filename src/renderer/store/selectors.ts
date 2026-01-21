import { StoreState } from './index';

// Computed selectors for the store
export const getWorkspacesForRepo = (state: StoreState, repoPath: string) => {
  const repo = state.repos[repoPath];
  if (!repo) return [];

  return repo.workspaceIds
    .map((id) => state.workspaces[id])
    .filter((workspace) => workspace !== undefined);
};

export const getSelectedRepo = (state: StoreState) => {
  if (!state.selectedRepoPath) return null;
  return state.repos[state.selectedRepoPath] || null;
};

export const getSelectedWorkspace = (state: StoreState) => {
  if (!state.selectedWorkspaceId) return null;
  return state.workspaces[state.selectedWorkspaceId] || null;
};
