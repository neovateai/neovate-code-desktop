import { ChevronDown } from 'lucide-react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import type { SessionData, WorkspaceData } from '../client/types/entities';
import type { NormalizedMessage } from '../client/types/message';
import { useStore } from '../store';
import { ActivityIndicator } from './ActivityIndicator';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { Message } from './messages/Message';
import { splitMessages } from './messages/messageHelpers';
import { OpenAppButton } from './OpenAppButton';
import { toastManager } from './ui/toast';

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
}: {
  workspace: WorkspaceData | null;
  emptyStateType: 'no-repos' | 'no-workspace' | null;
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
  const fetchSlashCommandList = useStore(
    (state) => state.fetchSlashCommandList,
  );
  const cancelSession = useStore((state) => state.cancelSession);
  const getSessionInput = useStore((state) => state.getSessionInput);
  const setSessionInput = useStore((state) => state.setSessionInput);
  const storeSendMessage = useStore((state) => state.sendMessage);
  const slashCommandJSXBySession = useStore(
    (state) => state.slashCommandJSXBySession,
  );

  // Get slash command JSX for current session
  const slashCommandJSX = selectedSessionId
    ? slashCommandJSXBySession[selectedSessionId]
    : null;

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

  const connectionState = useStore((state) => state.state);

  // Fetch sessions when selectedWorkspaceId changes
  useEffect(() => {
    if (connectionState !== 'connected') return;

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
        const response = await request('sessions.list', {
          cwd: workspace.worktreePath,
        });

        if (response.success) {
          const sessions: SessionData[] = response.data.sessions.map(
            (s: any) => ({
              ...s,
              modified: new Date(s.modified).getTime(),
              created: new Date(s.created).getTime(),
            }),
          );
          setSessions(selectedWorkspaceId, sessions);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions(selectedWorkspaceId, []);
      }
    };

    fetchSessions();
  }, [
    connectionState,
    selectedWorkspaceId,
    workspaces,
    request,
    setSessions,
    selectSession,
  ]);

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
    if (connectionState !== 'connected') return;
    if (!selectedSessionId || !selectedWorkspaceId) return;

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) return;

    const fetchMessages = async () => {
      try {
        const response = await request('session.messages.list', {
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
    connectionState,
    selectedSessionId,
    selectedWorkspaceId,
    workspaces,
    request,
    setMessages,
  ]);

  // Fetch model info once per session to initialize thinking state
  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (!selectedSessionId || !selectedWorkspaceId) return;

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) return;

    // Check if already initialized for this session
    const sessionInput = getSessionInput(selectedSessionId);
    if (sessionInput.thinkingInitialized) return;

    const fetchModelInfo = async () => {
      try {
        const response = await request('session.getModel', {
          cwd: workspace.worktreePath,
          sessionId: selectedSessionId,
          includeModelInfo: true,
        });
        if (
          response.success &&
          'modelInfo' in response.data &&
          response.data.modelInfo
        ) {
          const hasThinkingConfig = !!response.data.modelInfo.thinkingConfig;
          setSessionInput(selectedSessionId, {
            thinkingEnabled: hasThinkingConfig,
            thinking: hasThinkingConfig ? 'low' : null,
            thinkingInitialized: true,
          });
        } else {
          // Model doesn't support thinking
          setSessionInput(selectedSessionId, {
            thinkingEnabled: false,
            thinking: null,
            thinkingInitialized: true,
          });
        }
      } catch (error) {
        console.error('Failed to fetch model info:', error);
        // Default to disabled on error
        setSessionInput(selectedSessionId, {
          thinkingEnabled: false,
          thinking: null,
          thinkingInitialized: true,
        });
      }
    };

    fetchModelInfo();
  }, [
    connectionState,
    selectedSessionId,
    selectedWorkspaceId,
    workspaces,
    request,
    getSessionInput,
    setSessionInput,
  ]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const inputState = getSessionInput(selectedSessionId || '');

      setIsLoading(true);
      try {
        await storeSendMessage({
          message: content,
          planMode: inputState.planMode,
          think: inputState.thinking,
        });
        setInputValue('');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, selectedSessionId, getSessionInput, storeSendMessage],
  );

  const handleSelectSession = useCallback(
    (id: string) => {
      selectSession(id);
      setInputValue('');
    },
    [selectSession],
  );

  const handleCancel = useCallback(() => {
    if (selectedSessionId) {
      cancelSession(selectedSessionId);
    }
    setIsLoading(false);
  }, [selectedSessionId, cancelSession]);

  const handleShowForkModal = useCallback(() => {
    toastManager.add({
      type: 'info',
      title: 'Fork session',
      description: 'Fork functionality is not implemented yet',
    });
  }, []);

  // Create wrapper functions that provide context for ChatInput
  const fetchCommands = useCallback(async () => {
    if (!selectedWorkspaceId) return [];
    return fetchSlashCommandList(selectedWorkspaceId);
  }, [selectedWorkspaceId, fetchSlashCommandList]);

  // Ref for ChatInput to focus on session change
  const chatInputRef = useRef<ChatInputHandle>(null);

  // Auto-focus ChatInput when session is selected
  useEffect(() => {
    if (selectedSessionId) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedSessionId]);

  const contextValue: WorkspaceContextType | null = useMemo(() => {
    if (!workspace) return null;
    return {
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
  }, [
    workspace,
    activeSession,
    allSessions,
    selectedSessionId,
    handleSelectSession,
    messages,
    inputValue,
    isLoading,
    sendMessage,
  ]);

  if (!workspace || !contextValue) {
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

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <WorkspacePanel.Header />
        {/* <WorkspacePanel.SessionTabs /> */}
        {/* <WorkspacePanel.WorkspaceInfo /> */}
        <WorkspacePanel.Messages />
        <div
          className="p-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <ActivityIndicator sessionId={selectedSessionId} />
          <ChatInput
            ref={chatInputRef}
            onSubmit={sendMessage}
            onCancel={handleCancel}
            onShowForkModal={handleShowForkModal}
            fetchCommands={fetchCommands}
            placeholder={
              selectedSessionId
                ? 'Ask anything, @ for context'
                : 'Ask anything, @ for context with a new session...'
            }
            modelName={workspace.context.settings?.model}
            isProcessing={isLoading}
            sessionId={selectedSessionId || undefined}
            cwd={workspace.repoPath}
            request={request}
          />
          {slashCommandJSX}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
};

// Compound components
WorkspacePanel.Header = function Header() {
  const { workspace } = useWorkspaceContext();
  const request = useStore((state) => state.request);
  const deleteWorkspace = useStore((state) => state.deleteWorkspace);
  const selectWorkspace = useStore((state) => state.selectWorkspace);

  const handleMerge = async () => {
    try {
      const response = await request('project.workspaces.merge', {
        cwd: workspace.repoPath,
        name: workspace.id,
      });

      if (response.success) {
        deleteWorkspace(workspace.id);
        selectWorkspace(null);
      } else {
        console.error('Merge failed:', response.error);
      }
    } catch (error) {
      console.error('Merge failed:', error);
    }
  };

  const handleCreatePR = () => {
    toastManager.add({
      type: 'info',
      title: 'Create PR',
      description: 'Create PR functionality is not implemented yet',
    });
  };

  return (
    <div
      className="flex items-center justify-between h-12 px-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <h2
        className="text-base font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {workspace.id}
      </h2>
      <OpenAppButton cwd={workspace.worktreePath} request={request} />
    </div>
  );
};

WorkspacePanel.SessionTabs = function SessionTabs() {
  const { allSessions, selectedSessionId, selectSession } =
    useWorkspaceContext();
  const createSession = useStore((state) => state.createSession);

  if (allSessions.length === 0) {
    return (
      <div
        className="flex items-center justify-between py-4 px-4"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <p className="text-sm" style={{ color: '#999' }}>
          No sessions yet
        </p>
        <Button variant="ghost" size="sm" onClick={createSession}>
          + Create
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex overflow-x-auto items-center"
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
      <Button
        variant="ghost"
        size="sm"
        onClick={createSession}
        className="ml-2 shrink-0"
      >
        + Create
      </Button>
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
  const summary = useMemo(() => {
    if (session.summary) {
      if (session.summary.length > 16) {
        return session.summary.substring(0, 16) + '...';
      }
      return session.summary;
    } else {
      return 'New session';
    }
  }, [session.summary]);
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
      {summary}
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

  // Split messages into completed and pending sections
  const { completedMessages, pendingMessages } = useMemo(
    () => splitMessages(messages),
    [messages],
  );

  // Auto-scroll logic: scroll to bottom when messages change or session switches
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 300; // 300px threshold
    const isFirstLoad =
      prevMessagesLengthRef.current === 0 && messages.length > 0;
    const isSessionSwitch = prevSessionIdRef.current !== selectedSessionId;

    if (isNearBottom || isFirstLoad || isSessionSwitch) {
      container.scrollTo({ top: scrollHeight, behavior: 'instant' });
    }

    prevMessagesLengthRef.current = messages.length;
    prevSessionIdRef.current = selectedSessionId;
  }, [messages, selectedSessionId]);

  return (
    <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 min-w-0">
      {messages.length === 0 ? (
        <div className="text-center mt-8" style={{ color: '#999' }}>
          No messages yet. Start a conversation!
        </div>
      ) : (
        <div className="min-w-0">
          {/* Completed messages (memoized to prevent re-renders) */}
          {completedMessages.map((message) => (
            <MemoizedMessage
              key={message.uuid}
              message={message}
              allMessages={messages}
            />
          ))}

          {/* Pending messages (dynamic updates) */}
          {pendingMessages.map((message) => (
            <Message
              key={message.uuid}
              message={message}
              allMessages={messages}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Memoized message component to prevent re-renders of completed messages
const MemoizedMessage = memo(
  ({
    message,
    allMessages,
  }: {
    message: NormalizedMessage;
    allMessages: NormalizedMessage[];
  }) => {
    return <Message message={message} allMessages={allMessages} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if the message UUID changes (which shouldn't happen)
    return prevProps.message.uuid === nextProps.message.uuid;
  },
);

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
