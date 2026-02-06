import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { WorkspaceData } from '../client/types/entities';
import type { NormalizedMessage } from '../client/types/message';
import { AUTO_SCROLL_THRESHOLD_PX, FOCUS_DELAY_MS } from '../constants';
import { useNotification } from '../hooks';
import { useStore } from '../store';
import { ActivityIndicator } from './ActivityIndicator';
import { SessionInfoBar } from './SessionInfoBar';
import { ApprovalPanel } from './ApprovalPanel';
import { AskQuestionPanel } from './AskQuestionPanel';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { ForkModal } from './ForkModal';
import { Message } from './messages/Message';
import { splitMessages } from './messages/messageHelpers';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';
import { WelcomePanel } from './WelcomePanel';

// Main component
export const WorkspacePanel = ({
  workspace,
  emptyStateType,
}: {
  workspace: WorkspaceData | null;
  emptyStateType: 'no-repos' | 'no-workspace' | null;
}) => {
  const request = useStore((state) => state.request);
  const setMessages = useStore((state) => state.setMessages);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const workspaces = useStore((state) => state.workspaces);
  const messagesMap = useStore((state) => state.messages);
  const getSessionInput = useStore((state) => state.getSessionInput);
  const setSessionInput = useStore((state) => state.setSessionInput);
  const slashCommandJSXBySession = useStore(
    (state) => state.slashCommandJSXBySession,
  );

  useNotification(selectedSessionId, workspace?.worktreePath ?? '');

  const forkModalVisible = useStore((state) => state.forkModalVisible);
  const hideForkModal = useStore((state) => state.hideForkModal);
  const fork = useStore((state) => state.fork);

  const approvalBySession = useStore((state) => state.approvalBySession);
  const currentApproval = selectedSessionId
    ? approvalBySession[selectedSessionId]
    : null;
  const hasApproval = !!currentApproval;

  const isAskQuestion = currentApproval?.toolUse?.name === 'AskUserQuestion';

  const slashCommandJSX = selectedSessionId
    ? slashCommandJSXBySession[selectedSessionId]
    : null;

  const updateSessions = useStore((state) => state.updateSessions);
  const createOrSelectEmptySession = useStore(
    (state) => state.createOrSelectEmptySession,
  );

  const messages = useMemo(
    () => (selectedSessionId ? messagesMap[selectedSessionId] || [] : []),
    [selectedSessionId, messagesMap],
  );

  const connectionState = useStore((state) => state.state);

  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (!selectedWorkspaceId) return;

    updateSessions(selectedWorkspaceId);
  }, [connectionState, selectedWorkspaceId, updateSessions]);

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

  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (!selectedSessionId || !selectedWorkspaceId) return;

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) return;

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
          const variants = response.data.modelInfo.model?.variants;
          const variantKeys =
            variants && Object.keys(variants).length > 0
              ? Object.keys(variants)
              : [];
          const hasThinking = variantKeys.length > 0;
          setSessionInput(selectedSessionId, {
            thinkingEnabled: hasThinking,
            thinkingVariants: variantKeys,
            thinking: hasThinking ? variantKeys[0] : null,
            thinkingInitialized: true,
          });
        } else {
          setSessionInput(selectedSessionId, {
            thinkingEnabled: false,
            thinkingVariants: [],
            thinking: null,
            thinkingInitialized: true,
          });
        }
      } catch (error) {
        console.error('Failed to fetch model info:', error);
        setSessionInput(selectedSessionId, {
          thinkingEnabled: false,
          thinkingVariants: [],
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

  const handleForkSelect = useCallback(
    (uuid: string) => {
      fork(uuid);
    },
    [fork],
  );

  const chatInputRef = useRef<ChatInputHandle>(null);

  useEffect(() => {
    if (selectedSessionId) {
      const timer = setTimeout(() => {
        chatInputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [selectedSessionId]);

  const multiProjectSupport = useStore((state) => state.multiProjectSupport);

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

  return (
    <>
      <div className="flex flex-col h-full">
        {!multiProjectSupport && <WorkspacePanel.Header />}
        <WorkspacePanel.Messages />
        <div className="p-4 flex flex-col gap-3">
          <ActivityIndicator sessionId={selectedSessionId} />
          {/* Show AskQuestionPanel for AskUserQuestion tool, ApprovalPanel for other tools, otherwise ChatInput */}
          {hasApproval &&
          selectedSessionId &&
          isAskQuestion &&
          currentApproval ? (
            <AskQuestionPanel
              sessionId={selectedSessionId}
              questions={currentApproval.toolUse.params.questions || []}
              onResolve={(result, answers) => {
                if (result === 'deny') {
                  currentApproval.resolve('deny');
                } else {
                  // Pass updated params with answers
                  currentApproval.resolve('approve_once', {
                    ...currentApproval.toolUse.params,
                    answers,
                  });
                }
              }}
            />
          ) : hasApproval && selectedSessionId ? (
            <ApprovalPanel
              sessionId={selectedSessionId}
              cwd={workspace.worktreePath}
            />
          ) : (
            <ChatInput ref={chatInputRef} />
          )}
          {slashCommandJSX}
        </div>
      </div>

      {/* Fork Modal */}
      <ForkModal
        open={forkModalVisible}
        onClose={hideForkModal}
        messages={messages}
        onSelect={handleForkSelect}
      />
    </>
  );
};

WorkspacePanel.Header = function Header() {
  return (
    <div className="flex items-center justify-between h-12 px-4">
      <SessionInfoBar showProjectName={false} draggable={false} />
    </div>
  );
};

WorkspacePanel.Messages = function Messages() {
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const messagesMap = useStore((state) => state.messages);
  const messages = useMemo(
    () => (selectedSessionId ? messagesMap[selectedSessionId] || [] : []),
    [selectedSessionId, messagesMap],
  );

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
    const isNearBottom = distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX;
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
        <WelcomePanel />
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
