// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { Button } from './components/ui/button';
import { TestMessages } from './TestMessages';
import { TestUIComponents } from './components/TestUIComponents';
import { TestHugeIcons } from './components/test/TestHugeIcons';
import { ExamplePluginDemo } from './components/ExamplePluginDemo';

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
    <div
      style={{
        padding: '16px',
        borderTop: '2px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
        Test Controls
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button onClick={handleClearSelections} variant="outline" size="sm">
          Clear All Selections
        </Button>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Repo: {selectedRepoPath || 'none'} | Workspace:{' '}
          {selectedWorkspaceId || 'none'} | Session:{' '}
          {selectedSessionId || 'none'}
        </div>
      </div>
      {selectedWorkspaceId && workspaces[selectedWorkspaceId] && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '8px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Current Workspace Info:
          </div>
          <div style={{ display: 'grid', gap: '4px' }}>
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
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              Slash Commands (
              {slashCommandsByWorkspace[selectedWorkspaceId]?.length || 0}):
            </div>
            <div
              style={{
                maxHeight: '150px',
                overflow: 'auto',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              {slashCommandsByWorkspace[selectedWorkspaceId]?.length > 0 ? (
                <div style={{ display: 'grid', gap: '4px' }}>
                  {slashCommandsByWorkspace[selectedWorkspaceId].map(
                    (cmd, index) => (
                      <div key={`${index}-${cmd.name}`}>
                        {/* <span>{JSON.stringify(cmd)}</span> */}
                        <span style={{ fontWeight: 600 }}>/{cmd.name}</span>
                        {cmd.description && (
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {' '}
                            - {cmd.description}
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)' }}>
                  No slash commands cached
                </div>
              )}
            </div>
          </div>

          {/* Files */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              Files ({filesByWorkspace[selectedWorkspaceId]?.length || 0}):
            </div>
            <div
              style={{
                maxHeight: '150px',
                overflow: 'auto',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              {filesByWorkspace[selectedWorkspaceId]?.length > 0 ? (
                <div style={{ display: 'grid', gap: '2px' }}>
                  {filesByWorkspace[selectedWorkspaceId].map((file, index) => (
                    <div key={`${index}-${file}`}>{JSON.stringify(file)}</div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: 'inherit',
                  }}
                >
                  No files cached
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Config */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '8px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
          Global Config:
        </div>
        <div
          style={{
            maxHeight: '200px',
            overflow: 'auto',
            backgroundColor: 'var(--bg-tertiary)',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          {globalConfig ? (
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(globalConfig, null, 2)}
            </pre>
          ) : (
            <div
              style={{ color: 'var(--text-tertiary)', fontFamily: 'inherit' }}
            >
              No config loaded
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Control */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '8px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
          Onboarding Control:
        </div>
        <div style={{ marginBottom: '8px' }}>
          Completed: {onboardingCompleted ? 'Yes' : 'No'} | Visible:{' '}
          {onboardingVisible ? 'Yes' : 'No'} | Step: {onboardingStep}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" size="sm" onClick={resetOnboarding}>
            Reset Onboarding
          </Button>
          <Button variant="outline" size="sm" onClick={showOnboarding}>
            Show Onboarding
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <TestHugeIcons />
      </div>
      <div style={{ marginTop: '16px' }}>
        <TestMessages />
      </div>
      <div style={{ marginTop: '16px' }}>
        <TestUIComponents />
      </div>
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>
          Example Plugin Demo:
        </div>
        <ExamplePluginDemo />
      </div>
    </div>
  );
};

export default TestComponent;
