import { useStore } from './store';
import { MainLayout } from './components';
import { useStoreConnection } from './hooks';
import { Spinner } from './components/ui';

function App() {
  // Establish WebSocket connection on mount
  const connectionState = useStoreConnection();

  // Get state and actions from the store
  const {
    repos,
    selectedRepoPath,
    selectedWorkspaceId,
    selectedSessionId,
    selectRepo,
    selectWorkspace,
    selectSession,
    addMessage,
  } = useStore();

  // Mock function to send a message
  const handleSendMessage = async (content: string) => {
    if (selectedSessionId) {
      // In a real implementation, this would send the message via WebSocket
      // For now, we'll just add it directly to the store
      addMessage(selectedSessionId, {
        role: 'user',
        content,
        timestamp: Date.now(),
      });

      // Simulate a response after a short delay
      setTimeout(() => {
        if (selectedSessionId) {
          addMessage(selectedSessionId, {
            role: 'assistant',
            content: `Echo: ${content}`,
            timestamp: Date.now(),
          });
        }
      }, 1000);
    }
  };

  // Mock function to execute a command
  const handleExecuteCommand = async (command: string) => {
    // In a real implementation, this would send the command via WebSocket
    console.log(`Executing command: ${command}`);
    // For now, we'll just simulate the execution
    return Promise.resolve();
  };

  // Show loading UI while connecting
  if (connectionState !== 'connected') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Connecting to server...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <MainLayout
        repos={Object.values(repos)}
        selectedRepoPath={selectedRepoPath}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedSessionId={selectedSessionId}
        onSelectRepo={selectRepo}
        onSelectWorkspace={selectWorkspace}
        onSelectSession={selectSession}
        onSendMessage={handleSendMessage}
        onExecuteCommand={handleExecuteCommand}
      />
    </div>
  );
}

export default App;
