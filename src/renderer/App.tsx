import { useEffect, useState, useMemo } from 'react';
import { useStore } from './store';
import { useStoreConnection } from './hooks';
import { RepoSidebar } from './components/RepoSidebar';
import { WorkspacePanel } from './components/WorkspacePanel';
// import { WorkspaceChanges } from './components/WorkspaceChanges';
import { Terminal } from './components/Terminal';
import TestComponent from './TestComponent';
import { SettingsPage } from './components/settings';
import { ServerErrorDialog } from './components/server-error-dialog';
import {
  AppLayout,
  AppLayoutSidebar,
  AppLayoutPrimaryPanel,
  AppLayoutSecondaryPanel,
} from './components/layout';

function App() {
  const { connectionState, serverError, retry, exit } = useStoreConnection();

  const {
    repos,
    workspaces,
    selectedRepoPath,
    selectedWorkspaceId,
    selectRepo,
    selectWorkspace,
    showSettings,
    getGlobalConfigValue,
    initialized,
  } = useStore();

  // Get theme from config (default to 'system')
  const theme = getGlobalConfigValue<string>('desktop.theme', 'system');

  // Apply dark/light mode based on theme setting
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    try {
      if (theme === 'dark') {
        applyTheme(true);
      } else if (theme === 'light') {
        applyTheme(false);
      } else {
        // System preference with error handling
        if (typeof window.matchMedia === 'undefined') {
          console.warn('matchMedia not supported, falling back to light theme');
          applyTheme(false);
          return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        applyTheme(mediaQuery.matches);

        // Listen for system theme changes
        const handleChange = (e: MediaQueryListEvent) => {
          applyTheme(e.matches);
        };

        // Add event listener with compatibility check
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleChange);
        } else if (mediaQuery.addListener) {
          // Fallback for older browsers
          mediaQuery.addListener(handleChange);
        }

        // Cleanup listener on unmount or theme change
        return () => {
          if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', handleChange);
          } else if (mediaQuery.removeListener) {
            // Fallback for older browsers
            mediaQuery.removeListener(handleChange);
          }
        };
      }
    } catch (error) {
      console.error('Theme setup failed:', error);
      applyTheme(false); // Safe fallback to light theme
    }
  }, [theme]);

  const [visitedRepoPaths, setVisitedRepoPaths] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (selectedRepoPath && !visitedRepoPaths.has(selectedRepoPath)) {
      setVisitedRepoPaths((prev) => new Set(prev).add(selectedRepoPath));
    }
  }, [selectedRepoPath]);

  const visitedRepoPathsArray = useMemo(
    () => Array.from(visitedRepoPaths),
    [visitedRepoPaths],
  );

  if (connectionState === 'error') {
    return (
      <ServerErrorDialog
        message={serverError?.message ?? 'An unknown error occurred'}
        onRetry={retry}
        onExit={exit}
      />
    );
  }
  if (
    connectionState === 'idle' ||
    connectionState === 'connecting' ||
    (!initialized && connectionState === 'disconnected')
  ) {
    return <AppLoading />;
  }

  // Get the selected workspace
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]
    : null;

  // Determine empty state type
  const emptyStateType = !selectedWorkspace
    ? Object.keys(repos).length === 0
      ? 'no-repos'
      : 'no-workspace'
    : null;

  // Show settings page if enabled
  if (showSettings) {
    return (
      <div className="h-dvh flex flex-col">
        <SettingsPage />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-dvh"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <AppLayout>
        {/* Sidebar */}
        <AppLayoutSidebar>
          <RepoSidebar
            repos={Object.values(repos)}
            selectedRepoPath={selectedRepoPath}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectRepo={selectRepo}
            onSelectWorkspace={selectWorkspace}
          />
        </AppLayoutSidebar>

        {/* Main Content */}
        <AppLayoutPrimaryPanel>
          <WorkspacePanel
            workspace={selectedWorkspace}
            emptyStateType={emptyStateType}
          />
        </AppLayoutPrimaryPanel>

        {/* Right Panel */}
        <AppLayoutSecondaryPanel>
          <div className="h-full flex flex-col">
            {/* <WorkspaceChanges workspace={selectedWorkspace} /> */}
            {visitedRepoPathsArray.map((repoPath) => (
              <Terminal
                key={repoPath}
                cwd={repoPath}
                hidden={repoPath !== selectedRepoPath}
              />
            ))}
          </div>
        </AppLayoutSecondaryPanel>
      </AppLayout>

      <TestComponent />
    </div>
  );
}

function AppLoading() {
  const [text, setText] = useState('');
  const fullText = 'Neovate';

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-white text-neutral-900">
      <div className="text-6xl font-light">{text}</div>
    </div>
  );
}

export default App;
