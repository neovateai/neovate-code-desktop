import { useStore } from './store';

// Test the store implementation
const testStore = () => {
  console.log('Testing store implementation...');

  // Get the store state
  const store = useStore.getState();
  console.log('Initial store state:', {
    repos: Object.keys(store.repos),
    workspaces: Object.keys(store.workspaces),

    selectedRepoPath: store.selectedRepoPath,
    selectedWorkspaceId: store.selectedWorkspaceId,
    selectedSessionId: store.selectedSessionId,
  });

  // Test adding a repo
  const repo = {
    path: '/test/repo',
    name: 'Test Repo',
    workspaceIds: [],
    metadata: {
      lastAccessed: Date.now(),
    },
    gitRemote: {
      originUrl: 'https://github.com/test/repo',
      defaultBranch: 'main',
    },
  };

  console.log('Adding repo...');
  store.addRepo(repo);

  console.log('Store state after adding repo:', {
    repos: Object.keys(store.repos),
    workspaces: Object.keys(store.workspaces),
  });

  console.log('Repo in store:', store.repos['/test/repo']);
};

testStore();
