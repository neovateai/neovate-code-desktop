import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { WorkspaceData, SessionData } from '../client/types/entities';
import type { NormalizedMessage } from '../client/types/message';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { useStore } from '../store';
import { ChatInput } from './ChatInput';

// Define the context type
interface WorkspaceContextType {
  workspace: WorkspaceData;
  activeSession: SessionData | null;
  allSessions: SessionData[];
  selectedSessionId: string | null;
  selectSession: (id: string) => void;
  messages: NormalizedMessage[];
  inputValue: string;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  setInputValue: (value: string) => void;
}

// Create the context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

// Custom hook to use the context
export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspacePanel');
  }
  return context;
}

// Main component
export const WorkspacePanel = ({
  workspace,
  emptyStateType,
  onSendMessage,
}: {
  workspace: WorkspaceData | null;
  emptyStateType: 'no-repos' | 'no-workspace' | null;
  onSendMessage: (sessionId: string, content: string) => Promise<void>;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get store actions and state
  const request = useStore((state) => state.request);
  const setSessions = useStore((state) => state.setSessions);
  const setMessages = useStore((state) => state.setMessages);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const selectSession = useStore((state) => state.selectSession);
  const workspaces = useStore((state) => state.workspaces);
  const sessionsMap = useStore((state) => state.sessions);
  const messagesMap = useStore((state) => state.messages);

  // Get sessions and messages for the current workspace from store - memoized to avoid infinite loop
  const allSessions = useMemo(
    () => (selectedWorkspaceId ? sessionsMap[selectedWorkspaceId] || [] : []),
    [selectedWorkspaceId, sessionsMap],
  );

  const messages = useMemo(
    () => (selectedSessionId ? messagesMap[selectedSessionId] || [] : []),
    [selectedSessionId, messagesMap],
  );

  const activeSession =
    allSessions.find((s) => s.sessionId === selectedSessionId) || null;

  // Fetch sessions when selectedWorkspaceId changes
  useEffect(() => {
    if (!selectedWorkspaceId) {
      selectSession(null);
      return;
    }

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) {
      selectSession(null);
      return;
    }

    const fetchSessions = async () => {
      try {
        const response = await request<
          { cwd: string },
          { success: boolean; data: { sessions: SessionData[] } }
        >('sessions.list', { cwd: workspace.worktreePath });

        if (response.success) {
          setSessions(selectedWorkspaceId, response.data.sessions);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions(selectedWorkspaceId, []);
      }
    };

    fetchSessions();
  }, [selectedWorkspaceId, workspaces, request, setSessions, selectSession]);

  // Validate selectedSessionId when sessions load
  useEffect(() => {
    if (allSessions.length > 0) {
      // If no selected session or it doesn't exist in the list, set to first session
      if (
        !selectedSessionId ||
        !allSessions.find((s) => s.sessionId === selectedSessionId)
      ) {
        selectSession(allSessions[0].sessionId);
      }
    } else {
      // No sessions, reset selectedSessionId
      if (selectedSessionId !== null) {
        selectSession(null);
      }
    }
  }, [allSessions, selectedSessionId, selectSession]);

  // Fetch messages when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId || !selectedWorkspaceId) return;

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) return;

    const fetchMessages = async () => {
      try {
        const response = await request<
          { cwd: string; sessionId: string },
          { success: boolean; data: { messages: NormalizedMessage[] } }
        >('session.messages.list', {
          cwd: workspace.worktreePath,
          sessionId: selectedSessionId,
        });
        if (response.success) {
          setMessages(selectedSessionId, response.data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [
    selectedSessionId,
    selectedWorkspaceId,
    workspaces,
    request,
    setMessages,
  ]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(selectedSessionId || '', content);
      setInputValue('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session switching - reset input
  const handleSelectSession = (id: string) => {
    selectSession(id);
    setInputValue('');
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {emptyStateType === 'no-repos' ? <FolderIcon /> : <BranchIcon />}
            </EmptyMedia>
            <EmptyTitle>
              {emptyStateType === 'no-repos'
                ? 'No Repositories Yet'
                : 'No Workspace Selected'}
            </EmptyTitle>
            <EmptyDescription>
              {emptyStateType === 'no-repos'
                ? 'Add a repository to start working with workspaces and branches'
                : 'Select a workspace from the sidebar to start coding'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const contextValue: WorkspaceContextType = {
    workspace,
    activeSession,
    allSessions,
    selectedSessionId,
    selectSession: handleSelectSession,
    messages,
    inputValue,
    isLoading,
    sendMessage,
    setInputValue,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <WorkspacePanel.Header />
        <WorkspacePanel.SessionTabs />
        <WorkspacePanel.WorkspaceInfo />
        <WorkspacePanel.Messages />
        <div
          className="p-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder={
              selectedSessionId
                ? 'Type your message...'
                : 'Type your message with a new session...'
            }
            disabled={isLoading}
          />
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
};

// Compound components
WorkspacePanel.Header = function Header() {
  const { workspace } = useWorkspaceContext();

  return (
    <div
      className="p-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Workspace: {workspace.branch}
          </h2>
          <p className="text-sm" style={{ color: '#666' }}>
            {workspace.repoPath}
          </p>
        </div>
        <Button variant="default" size="sm">
          Open in Editor
        </Button>
      </div>
    </div>
  );
};

WorkspacePanel.SessionTabs = function SessionTabs() {
  const { allSessions, selectedSessionId, selectSession } =
    useWorkspaceContext();

  if (allSessions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-4"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <p className="text-sm" style={{ color: '#999' }}>
          No sessions yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex overflow-x-auto"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {allSessions.map((session) => (
        <WorkspacePanel.SessionTab
          key={session.sessionId}
          session={session}
          isActive={session.sessionId === selectedSessionId}
          onClick={() => selectSession(session.sessionId)}
        />
      ))}
    </div>
  );
};

WorkspacePanel.SessionTab = function SessionTab({
  session,
  isActive,
  onClick,
}: {
  session: SessionData;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="px-4 py-2 text-sm cursor-pointer whitespace-nowrap"
      style={
        isActive
          ? { borderBottom: '2px solid #0070f3', color: 'var(--text-primary)' }
          : { color: '#666' }
      }
      onClick={onClick}
    >
      {session.sessionId.substring(0, 8)}
    </div>
  );
};

WorkspacePanel.WorkspaceInfo = function WorkspaceInfo() {
  const { workspace } = useWorkspaceContext();

  return (
    <div
      className="p-3 text-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center"
        style={{ color: 'var(--text-primary)' }}
      >
        <BranchIcon />
        <span className="ml-2">{workspace.branch}</span>
        <span className="mx-2">•</span>
        <span style={{ color: '#666' }}>
          {workspace.metadata.status === 'active'
            ? 'Active'
            : workspace.metadata.status}
        </span>
        {workspace.gitState.isDirty && (
          <>
            <span className="mx-2">•</span>
            <span style={{ color: '#f59e0b' }}>Uncommitted changes</span>
          </>
        )}
        <span className="ml-auto flex items-center">
          <StatusIcon status={workspace.metadata.status} />
          <span className="ml-1 capitalize">{workspace.metadata.status}</span>
        </span>
      </div>
    </div>
  );
};

WorkspacePanel.Messages = function Messages() {
  const { messages, selectedSessionId } = useWorkspaceContext();

  // Refs for auto-scroll functionality
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const prevSessionIdRef = useRef<string | null>(null);

  // Auto-scroll logic: scroll to bottom when messages change or session switches
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100; // 100px threshold
    const isFirstLoad =
      prevMessagesLengthRef.current === 0 && messages.length > 0;
    const isSessionSwitch = prevSessionIdRef.current !== selectedSessionId;

    if (isNearBottom || isFirstLoad || isSessionSwitch) {
      container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }

    prevMessagesLengthRef.current = messages.length;
    prevSessionIdRef.current = selectedSessionId;
  }, [messages, selectedSessionId]);

  // if (!activeSessionId) {
  //   return (
  //     <div className="flex-1 flex items-center justify-center">
  //       <div className="text-center" style={{ color: '#999' }}>
  //         Select a session to view messages
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="text-center mt-8" style={{ color: '#999' }}>
          No messages yet. Start a conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <WorkspacePanel.Message key={message.uuid} message={message} />
          ))}
        </div>
      )}
    </div>
  );
};

WorkspacePanel.Message = function Message({
  message,
}: {
  message: NormalizedMessage;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-lg p-3"
        style={{
          backgroundColor: isUser ? '#0070f3' : 'var(--bg-surface)',
          color: isUser ? 'white' : 'var(--text-primary)',
        }}
      >
        <div className="flex items-center mb-1">
          <span className="text-xs font-semibold">
            {message.role === 'user'
              ? 'You'
              : message.role === 'assistant'
                ? 'Assistant'
                : 'System'}
          </span>
          <span
            className="text-xs ml-2"
            style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#666' }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {JSON.stringify(message)}
        </div>
      </div>
    </div>
  );
};

// Icons
function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M1.75 2A1.75 1.75 0 000 3.75v8.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0016 12.25v-6.5A1.75 1.75 0 0014.25 4H7.5L6.293 2.793A1 1 0 005.586 2H1.75zM1.5 3.75a.25.25 0 01.25-.25h3.836a.25.25 0 01.177.073L7.207 5.5h7.043a.25.25 0 01.25.25v6.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25v-8.5z"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M5 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM5 6h10v1H5V6z"
      />
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  const color =
    status === 'active'
      ? '#10B981'
      : status === 'archived'
        ? '#6B7280'
        : '#F59E0B';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill={color} />
    </svg>
  );
}
