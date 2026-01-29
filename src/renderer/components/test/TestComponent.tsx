import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { useStore } from '../../store';
import { ExamplePluginDemo } from './ExamplePluginDemo';
import { TestHugeIcons } from './TestHugeIcons';
import { TestMessages } from './TestMessages';
import { TestUIComponents } from './TestUIComponents';

const TestComponent = () => {
  const isVisible = useStore((state) => state.isTestComponentVisible);
  const setTestComponentVisible = useStore(
    (state) => state.setTestComponentVisible,
  );
  const lastPressTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        const now = Date.now();
        if (now - lastPressTimeRef.current < 300) {
          setTestComponentVisible(!isVisible);
          lastPressTimeRef.current = 0;
        } else {
          lastPressTimeRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, setTestComponentVisible]);

  const {
    selectedRepoPath,
    selectedWorkspaceId,
    selectedSessionId,
    workspaces,
    sessions,
    selectRepo,
    selectWorkspace,
    selectSession,
    filesByWorkspace,
    slashCommandsByWorkspace,
    globalConfig,
    // Onboarding state
    onboardingCompleted,
    onboardingVisible,
    onboardingStep,
    resetOnboarding,
    showOnboarding,
  } = useStore();

  const handleClearSelections = () => {
    selectRepo(null);
    selectWorkspace(null);
    selectSession(null);
    console.log('Cleared all selections');
  };

  if (!isVisible) return null;

  return (
    <div className="p-4 border-t-2 border-border bg-card">
      <div className="mb-2 text-sm font-semibold">Test Controls</div>
      <div className="flex gap-2 items-center">
        <Button onClick={handleClearSelections} variant="outline" size="sm">
          Clear All Selections
        </Button>
        <div className="text-xs text-muted-foreground">
          Repo: {selectedRepoPath || 'none'} | Workspace:{' '}
          {selectedWorkspaceId || 'none'} | Session:{' '}
          {selectedSessionId || 'none'}
        </div>
      </div>
      {selectedWorkspaceId && workspaces[selectedWorkspaceId] && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
          <div className="font-semibold mb-1">Current Workspace Info:</div>
          <div className="grid gap-1">
            <div>ID: {workspaces[selectedWorkspaceId].id}</div>
            <div>Branch: {workspaces[selectedWorkspaceId].branch}</div>
            <div>Path: {workspaces[selectedWorkspaceId].worktreePath}</div>
            <div>
              Sessions:{' '}
              {sessions[selectedWorkspaceId]
                ?.map((s) => s.sessionId.substring(0, 8) + ' - ' + s.summary)
                .join(', ') || 'None'}
            </div>
          </div>

          {/* Slash Commands */}
          <div className="mt-3">
            <div className="font-semibold mb-1">
              Slash Commands (
              {slashCommandsByWorkspace[selectedWorkspaceId]?.length || 0}):
            </div>
            <div className="max-h-[150px] overflow-auto bg-muted p-2 rounded text-[11px]">
              {slashCommandsByWorkspace[selectedWorkspaceId]?.length > 0 ? (
                <div className="grid gap-1">
                  {slashCommandsByWorkspace[selectedWorkspaceId].map(
                    (cmd, index) => (
                      <div key={`${index}-${cmd.name}`}>
                        {/* <span>{JSON.stringify(cmd)}</span> */}
                        <span className="font-semibold">/{cmd.name}</span>
                        {cmd.description && (
                          <span className="text-muted-foreground">
                            {' '}
                            - {cmd.description}
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No slash commands cached
                </div>
              )}
            </div>
          </div>

          {/* Files */}
          <div className="mt-3">
            <div className="font-semibold mb-1">
              Files ({filesByWorkspace[selectedWorkspaceId]?.length || 0}):
            </div>
            <div className="max-h-[150px] overflow-auto bg-muted p-2 rounded text-[11px] font-mono">
              {filesByWorkspace[selectedWorkspaceId]?.length > 0 ? (
                <div className="grid gap-0.5">
                  {filesByWorkspace[selectedWorkspaceId].map((file, index) => (
                    <div key={`${index}-${file}`}>{JSON.stringify(file)}</div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground font-sans">
                  No files cached
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Config */}
      <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
        <div className="font-semibold mb-1">Global Config:</div>
        <div className="max-h-[200px] overflow-auto bg-muted p-2 rounded text-[11px] font-mono">
          {globalConfig ? (
            <pre className="m-0 whitespace-pre-wrap break-words">
              {JSON.stringify(globalConfig, null, 2)}
            </pre>
          ) : (
            <div className="text-muted-foreground font-sans">
              No config loaded
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Control */}
      <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
        <div className="font-semibold mb-1">Onboarding Control:</div>
        <div className="mb-2">
          Completed: {onboardingCompleted ? 'Yes' : 'No'} | Visible:{' '}
          {onboardingVisible ? 'Yes' : 'No'} | Step: {onboardingStep}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetOnboarding}>
            Reset Onboarding
          </Button>
          <Button variant="outline" size="sm" onClick={showOnboarding}>
            Show Onboarding
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <TestHugeIcons />
      </div>
      <div className="mt-4">
        <TestMessages />
      </div>
      <div className="mt-4">
        <TestUIComponents />
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-2">Example Plugin Demo:</div>
        <ExamplePluginDemo />
      </div>
    </div>
  );
};

export default TestComponent;
