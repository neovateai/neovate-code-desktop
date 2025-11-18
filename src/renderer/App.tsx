import { useStore } from './store';
import { MainLayout } from './components';

function App() {
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
