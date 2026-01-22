import { useEffect, useState, useMemo } from 'react';
import { useStore } from './store';
import { useStoreConnection } from './hooks';
import { RepoSidebar } from './components/RepoSidebar';
import { WorkspacePanel } from './components/WorkspacePanel';
// import { WorkspaceChanges } from './components/WorkspaceChanges';
import { Terminal } from './components/Terminal';
import TestComponent from './TestComponent';
import { SettingsPage } from './components/settings';
import { ServerErrorDialog } from './components/ServerErrorDialog';
import { UpdaterToast } from './components/UpdaterToast';
import {
  AppLayout,
  AppLayoutTitleBar,
  AppLayoutPrimarySidebar,
  AppLayoutChatPanel,
  AppLayoutContentPanel,
  AppLayoutSecondarySidebar,
  AppLayoutActivityBar,
  ActivityBar,
  SecondarySidebar,
} from './components/layout';
import { AppLayoutPanelGroup } from './components/layout/AppLayout';
import { getNestedValue } from './lib/utils';
import { TitleBar } from './components/app/TitleBar';
import { OnboardingModal } from './components/Onboarding';

function App() {
  const { connectionState, serverError, retry, exit } = useStoreConnection();

  const repos = useStore((s) => s.repos);
  const workspaces = useStore((s) => s.workspaces);
  const selectedRepoPath = useStore((s) => s.selectedRepoPath);
  const selectedWorkspaceId = useStore((s) => s.selectedWorkspaceId);
  const selectRepo = useStore((s) => s.selectRepo);
  const selectWorkspace = useStore((s) => s.selectWorkspace);
  const showSettings = useStore((s) => s.showSettings);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const globalConfig = useStore((s) => s.globalConfig);
  const setGlobalConfig = useStore((s) => s.setGlobalConfig);
  const initialized = useStore((s) => s.initialized);

  // Get theme from config (default to 'system')
  // Subscribe to globalConfig directly so component re-renders when config changes
  const theme = getNestedValue<string>(globalConfig, 'desktop.theme', 'system');

  // Listen for menu events from main process
  useEffect(() => {
    const cleanupSettings = window.electron.onMenuOpenSettings(() => {
      setShowSettings(true);
    });

    const cleanupTheme = window.electron.onMenuToggleTheme(() => {
      // Toggle between light and dark (Option A behavior)
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setGlobalConfig('desktop.theme', newTheme);
    });

    return () => {
      cleanupSettings();
      cleanupTheme();
    };
  }, [setShowSettings, setGlobalConfig, theme]);

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

  return (
    <>
      {/* Settings Page - hidden with CSS when not active */}
      <div
        className="h-dvh flex flex-col"
        style={{ display: showSettings ? 'flex' : 'none' }}
      >
        <SettingsPage />
      </div>

      {/* Main App - hidden with CSS when settings is shown */}
      <AppLayout>
        <div
          className="flex flex-col h-dvh bg-(--bg-surface)"
          style={{ display: showSettings ? 'none' : 'flex' }}
        >
          {/* Custom Title Bar */}
          <AppLayoutTitleBar>
            <TitleBar />
          </AppLayoutTitleBar>

          <div className="flex-1 flex flex-row min-h-0">
            <AppLayoutPanelGroup>
              {/* Tasks Panel (left sidebar) */}
              <AppLayoutPrimarySidebar>
                <RepoSidebar
                  repos={Object.values(repos)}
                  selectedRepoPath={selectedRepoPath}
                  selectedWorkspaceId={selectedWorkspaceId}
                  onSelectRepo={selectRepo}
                  onSelectWorkspace={selectWorkspace}
                />
              </AppLayoutPrimarySidebar>

              {/* Chat Panel (main content) */}
              <AppLayoutChatPanel>
                <WorkspacePanel
                  workspace={selectedWorkspace}
                  emptyStateType={emptyStateType}
                />
              </AppLayoutChatPanel>

              {/* Tabs Panel (terminal, logs - conditional) */}
              <AppLayoutContentPanel>
                <div className="h-full flex flex-col">
                  {visitedRepoPathsArray.map((repoPath) => (
                    <Terminal
                      key={repoPath}
                      cwd={repoPath}
                      hidden={repoPath !== selectedRepoPath}
                    />
                  ))}
                </div>
              </AppLayoutContentPanel>

              {/* Secondary Sidebar (files, git - conditional) */}
              <AppLayoutSecondarySidebar>
                <SecondarySidebar />
              </AppLayoutSecondarySidebar>
            </AppLayoutPanelGroup>

            {/* Activity Bar (always visible) */}
            <AppLayoutActivityBar>
              <ActivityBar />
            </AppLayoutActivityBar>
          </div>

          <TestComponent />
        </div>
      </AppLayout>

      {/* Onboarding Modal - renders on top when visible */}
      <OnboardingModal />
      <UpdaterToast />
    </>
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
