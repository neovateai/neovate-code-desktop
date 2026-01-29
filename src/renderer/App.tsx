import { useEffect, useState, useMemo, useRef } from 'react';
import { Agentation } from 'agentation';
import { useStore } from './store';
import { useStoreConnection, useGlobalKeybindings } from './hooks';
import { RepoSidebar } from './components/RepoSidebar';
import { WorkspacePanel } from './components/WorkspacePanel';
import { ContentPanel } from './components/ContentPanel';
import TestComponent from './components/test/TestComponent';
import { SettingsPage } from './components/settings';
import { ServerErrorDialog } from './components/ServerErrorDialog';
import { UpdaterToast } from './components/UpdaterToast';
import { AppLoading } from './components/AppLoading';
import { MIN_LOADING_TIME_MS } from './constants';
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
import { TitleBar } from './components/layout/TitleBar';
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
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const initialized = useStore((s) => s.initialized);
  const developerMode = useStore((s) => s.developerMode);

  // Minimum display time for loading animation
  const loadStartTime = useRef(Date.now());
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const elapsed = Date.now() - loadStartTime.current;
    const remaining = MIN_LOADING_TIME_MS - elapsed;

    if (remaining <= 0) {
      setMinTimeElapsed(true);
    } else {
      const timer = setTimeout(() => setMinTimeElapsed(true), remaining);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for menu events from main process
  useEffect(() => {
    const cleanupSettings = window.electron.onMenuOpenSettings(() => {
      setShowSettings(true);
    });

    const cleanupTheme = window.electron.onMenuToggleTheme(() => {
      // Toggle between light and dark
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });

    return () => {
      cleanupSettings();
      cleanupTheme();
    };
  }, [setShowSettings, setTheme, theme]);

  // Global keybindings (New Chat, Prev/Next Session, Copy Path)
  useGlobalKeybindings();

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

  // Show loading until both: connection ready AND minimum time elapsed
  const isLoading =
    connectionState === 'idle' ||
    connectionState === 'connecting' ||
    (!initialized && connectionState === 'disconnected') ||
    !minTimeElapsed;

  if (isLoading) {
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
          className="flex flex-col h-dvh bg-sidebar"
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
                    <ContentPanel
                      key={repoPath}
                      repoPath={repoPath}
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
      {process.env.NODE_ENV !== 'production' && developerMode && <Agentation />}
    </>
  );
}

export default App;
