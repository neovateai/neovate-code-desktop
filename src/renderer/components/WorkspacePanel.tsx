import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { WorkspaceData } from '../client/types/entities';
import type { NormalizedMessage } from '../client/types/message';
import { FOCUS_DELAY_MS } from '../constants';
import { useNotification } from '../hooks';
import { useStore } from '../store';
import { ActivityIndicator } from './ActivityIndicator';
import { SessionInfoBar } from './SessionInfoBar';
import { ApprovalPanel } from './ApprovalPanel';
import { AskQuestionPanel } from './AskQuestionPanel';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { ForkModal } from './ForkModal';
import { Message } from './messages/Message';
import { computeToolPairsMap, splitMessages } from './messages/messageHelpers';
import type { ToolPair } from './messages/types';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';
import { WelcomePanel } from './WelcomePanel';

const EMPTY_MESSAGES: NormalizedMessage[] = [];

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
  const messages = useStore(
    (state) => state.messages[state.selectedSessionId ?? ''] ?? EMPTY_MESSAGES,
  );

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevSessionIdRef = useRef<string | null>(null);

  // Split messages into completed and pending sections
  const { completedMessages, pendingMessages } = useMemo(
    () => splitMessages(messages),
    [messages],
  );

  // Pre-compute tool pairs for all messages once at the list level
  const toolPairsMap = useMemo(() => computeToolPairsMap(messages), [messages]);

  // When session changes, scroll to bottom immediately
  useEffect(() => {
    if (prevSessionIdRef.current !== selectedSessionId) {
      prevSessionIdRef.current = selectedSessionId;
      virtuosoRef.current?.scrollToIndex({
        index: 'LAST',
        behavior: 'auto',
      });
    }
  }, [selectedSessionId, messages]);

  // Render a single message item for the virtualized list
  const renderCompletedItem = useCallback(
    (index: number) => {
      const message = completedMessages[index];
      return (
        <MemoizedMessage
          key={message.uuid}
          message={message}
          toolPairs={toolPairsMap.get(message.uuid)}
        />
      );
    },
    [completedMessages, toolPairsMap],
  );

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 min-w-0">
        <WelcomePanel />
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      totalCount={completedMessages.length}
      itemContent={renderCompletedItem}
      followOutput="auto"
      increaseViewportBy={{ top: 400, bottom: 200 }}
      className="flex-1 min-w-0"
      style={{ padding: '1rem' }}
      components={{
        // Render pending messages (streaming) after the virtualized list
        Footer: () =>
          pendingMessages.length > 0 ? (
            <div className="min-w-0">
              {pendingMessages.map((message) => (
                <Message
                  key={message.uuid}
                  message={message}
                  toolPairs={toolPairsMap.get(message.uuid)}
                />
              ))}
            </div>
          ) : null,
      }}
    />
  );
};

// Memoized message component to prevent re-renders of completed messages
const MemoizedMessage = memo(
  ({
    message,
    toolPairs,
  }: {
    message: NormalizedMessage;
    toolPairs?: ToolPair[];
  }) => {
    return <Message message={message} toolPairs={toolPairs} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if the message UUID or its tool pairs change
    return (
      prevProps.message.uuid === nextProps.message.uuid &&
      prevProps.toolPairs === nextProps.toolPairs
    );
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
