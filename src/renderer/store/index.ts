import { create } from 'zustand';
import { WebSocketTransport } from '../client/transport/WebSocketTransport';
import { MessageBus } from '../client/messaging/MessageBus';
import { countTokens } from '../lib/tokenUtils';
import { logger } from '../lib/logger';
import { toastManager } from '../components/ui/toast';
import {
  DEFAULT_WEBSOCKET_URL,
  WEBSOCKET_RECONNECT_INTERVAL_MS,
  WEBSOCKET_MAX_RECONNECT_INTERVAL_MS,
  FORK_MODAL_DELAY_MS,
} from '../constants';
import type { NormalizedMessage } from '../client/types/message';
import type {
  HandlerMethod,
  HandlerInput,
  HandlerOutput,
} from '../nodeBridge.types';
import {
  isSlashCommand,
  parseSlashCommand,
  type CommandEntry,
} from '../slash-commands/types';
import { localJSXCommands } from '../slash-commands';

// Import slices
import { createUISlice, type UISlice } from './slices/ui';
import { createEntitiesSlice, type EntitiesSlice } from './slices/entities';
import {
  createSessionSlice,
  type SessionSlice,
  type PlanMode,
  type ThinkingLevel,
  type SessionProcessingState,
  type SessionInputState,
  defaultSessionInputState,
  defaultSessionProcessingState,
} from './slices/session';
import { createConfigSlice, type ConfigSlice } from './slices/config';
import {
  createOnboardingSlice,
  type OnboardingSlice,
  type OnboardingStep,
  defaultOnboardingState,
} from './slices/onboarding';

// Re-export types from slices
export type {
  PlanMode,
  ThinkingLevel,
  SessionProcessingState,
  SessionInputState,
  InputMode,
} from './slices/session';
export { defaultSessionInputState, getInputMode } from './slices/session';
export type { OnboardingStep } from './slices/onboarding';

// Connection state types
interface ConnectionState {
  // WebSocket connection state
  // Flow:
  // idle -> connecting -> connected
  // idle/connecting -> error (startup failure)
  // connected -> disconnected -> connecting -> connected (reconnect loop)
  state: 'idle' | 'disconnected' | 'connecting' | 'connected' | 'error';
  transport: WebSocketTransport | null;
  messageBus: MessageBus | null;
  initialized: boolean;

  // Server URL
  serverUrl: string | null;
}

// UI Selection state
interface UISelectionState {
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  selectedSessionId: string | null;
  showSettings: boolean;
  settingsActiveTab: 'preferences' | 'providers' | 'mcp';
  openRepoAccordions: string[];
  expandedSessionGroups: Record<string, boolean>;
  isTestComponentVisible: boolean;
}

// Fork modal state
interface ForkModalState {
  forkModalVisible: boolean;
  forkParentUuid: string | null;
}

// Core state (connection + UI selections + fork)
interface CoreState extends ConnectionState, UISelectionState, ForkModalState {}

// Core actions
interface CoreActions {
  // WebSocket actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  request: <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ) => Promise<HandlerOutput<K>>;
  onEvent: <T>(event: string, handler: (data: T) => void) => void;
  initialize: () => Promise<void>;
  sendMessage: (params: {
    message: string | null;
    planMode: PlanMode;
    parentUuid?: string;
    think: ThinkingLevel;
    images?: string[];
  }) => Promise<void>;

  // Server URL action
  setUrl: (url: string) => void;

  // UI Selections
  selectRepo: (path: string | null) => void;
  selectWorkspace: (id: string | null) => void;
  selectSession: (id: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setSettingsActiveTab: (tab: 'preferences' | 'providers' | 'mcp') => void;
  setOpenRepoAccordions: (ids: string[]) => void;
  toggleSessionGroupExpanded: (workspaceId: string) => void;
  setTestComponentVisible: (visible: boolean) => void;

  // Session control actions
  cancelSession: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;

  // Connection state setter
  setConnectionState: (state: CoreState['state']) => void;

  // Fork modal actions
  showForkModal: () => void;
  hideForkModal: () => void;
  fork: (targetMessageUuid: string) => void;
}

// Combined store type
type Store = CoreState &
  CoreActions &
  EntitiesSlice &
  SessionSlice &
  ConfigSlice &
  UISlice &
  OnboardingSlice;

const useStore = create<Store>()((set, get, api) => ({
  // ==================== Core State ====================
  // Initial WebSocket state
  state: 'idle',
  transport: null,
  messageBus: null,
  initialized: false,

  // Initial server URL
  serverUrl: null,

  // Initial UI state
  selectedRepoPath: null,
  selectedWorkspaceId: null,
  selectedSessionId: null,
  showSettings: false,
  settingsActiveTab: 'preferences',
  openRepoAccordions: [],
  expandedSessionGroups: {},
  isTestComponentVisible: false,

  // Initial fork modal state
  forkModalVisible: false,
  forkParentUuid: null,

  // ==================== Core Actions ====================
  connect: async () => {
    const { transport, serverUrl } = get();
    if (transport?.isConnected()) {
      return;
    }

    set({ state: 'connecting' });

    const url = serverUrl ?? DEFAULT_WEBSOCKET_URL;

    try {
      const newTransport = new WebSocketTransport({
        url,
        reconnectInterval: WEBSOCKET_RECONNECT_INTERVAL_MS,
        maxReconnectInterval: WEBSOCKET_MAX_RECONNECT_INTERVAL_MS,
        shouldReconnect: true,
      });

      newTransport.onError(() => {
        set({ state: 'disconnected' });
      });

      newTransport.onClose(() => {
        set({ state: 'disconnected' });
      });

      const newMessageBus = new MessageBus();
      newMessageBus.setTransport(newTransport);

      // Set the transport and messageBus before connecting
      set({ transport: newTransport, messageBus: newMessageBus });

      // Connect the transport
      await newTransport.connect();

      // Set state to connected after successful connection
      set({ state: 'connected' });
    } catch (error) {
      set({ state: 'error' });
    }
  },

  disconnect: async () => {
    const { transport, messageBus } = get();

    if (transport) {
      await transport.close();
    }

    if (messageBus) {
      messageBus.cancelPendingRequests();
    }

    set({
      state: 'disconnected',
      transport: null,
      messageBus: null,
    });
  },

  request: async <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ): Promise<HandlerOutput<K>> => {
    const { messageBus, state } = get();

    if (state !== 'connected' || !messageBus) {
      throw new Error(
        `Cannot make request when not connected. Current state: ${state}`,
      );
    }

    logger.debug(
      `[STORE] REQUEST ${method} --data "${JSON.stringify(params).replace(/"/g, '\\"')}"`,
    );
    const response = await messageBus.request<
      HandlerInput<K>,
      HandlerOutput<K>
    >(method, params);
    logger.debug('[STORE]', 'RESPONSE', method, response);
    return response;
  },

  onEvent: <T>(event: string, handler: (data: T) => void) => {
    const { messageBus, state } = get();

    if (state !== 'connected' || !messageBus) {
      throw new Error(
        `Cannot subscribe to events when not connected. Current state: ${state}`,
      );
    }

    messageBus.onEvent<T>(event, handler);
  },

  initialize: async () => {
    const { loadGlobalConfig, initialized, onEvent, addMessage } = get();

    // Only initialize once
    if (initialized) {
      logger.debug('[STORE]', 'Already initialized, skipping');
      return;
    }

    await loadGlobalConfig();

    onEvent('message', (data: any) => {
      if (data.message && data.sessionId) {
        addMessage(data.sessionId, data.message);
      }
    });

    onEvent('chunk', (data: any) => {
      // Count real tokens from chunk delta
      if (data.sessionId && data.chunk) {
        const chunk = data.chunk;
        // Only count tokens from text/reasoning/tool-input delta events
        if (
          chunk.type === 'text-delta' ||
          chunk.type === 'reasoning-delta' ||
          chunk.type === 'tool-input-delta'
        ) {
          const tokenCount = countTokens(chunk.delta || '');
          if (tokenCount > 0) {
            const { setSessionProcessing, getSessionProcessing } = get();
            const current = getSessionProcessing(data.sessionId);
            setSessionProcessing(data.sessionId, {
              processingToken: current.processingToken + tokenCount,
            });
          }
        }
      }
    });

    onEvent('streamResult', (data: any) => {
      logger.debug('[STORE]', 'streamResult', data);
      // Update retry info if present
      if (data.sessionId && data.retryInfo) {
        const { setSessionProcessing } = get();
        setSessionProcessing(data.sessionId, {
          retryInfo: data.retryInfo,
        });
      }
    });

    // Listen for sub-agent progress events
    onEvent('agent.progress', (data: any) => {
      if (data.parentToolUseId) {
        const { updateAgentProgress } = get();
        updateAgentProgress({
          parentToolUseId: data.parentToolUseId,
          agentId: data.agentId,
          agentType: data.agentType,
          prompt: data.prompt,
          message: data.message,
          status: data.status,
          model: data.model,
        });
      }
    });

    // Register toolApproval handler for backend tool approval requests
    const { messageBus } = get();
    if (messageBus) {
      messageBus.registerHandler('toolApproval', async (data: any) => {
        const { toolUse, category } = data;
        const sessionId = get().selectedSessionId;
        if (!sessionId) {
          return { approved: false, denyReason: 'No active session' };
        }
        const { approveToolUse } = get();
        return approveToolUse({ sessionId, toolUse, category });
      });
    }

    set({ initialized: true });
  },

  setUrl: (url) => set({ serverUrl: url }),

  sendMessage: async (params: {
    message: string | null;
    planMode: PlanMode;
    parentUuid?: string;
    think: ThinkingLevel;
    images?: string[];
  }) => {
    const {
      selectedSessionId,
      selectedWorkspaceId,
      workspaces,
      request,
      createSession,
      sessions,
      updateSession,
      setSessionProcessing,
      setSessionInput,
      addMessage,
    } = get();

    let sessionId = selectedSessionId;
    let model: string | undefined = undefined;

    if (!selectedWorkspaceId) {
      throw new Error('No workspace selected to create session');
    }

    if (!sessionId) {
      sessionId = createSession();
    }

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) {
      throw new Error(`Workspace ${selectedWorkspaceId} not found`);
    }

    const cwd = workspace.worktreePath;
    let message = params.message;

    const isBrainstormMode = params.planMode === 'brainstorm';
    if (isBrainstormMode) {
      message = `/spec:brainstorm ${message}`;
      setSessionInput(sessionId, {
        planMode: 'normal',
      });
    }

    // Handle bash mode: execute shell commands directly (starts with !)
    if (message && message.startsWith('!')) {
      const command = message.slice(1).trim();
      if (!command) return; // Empty command, do nothing

      // Set processing state
      setSessionProcessing(sessionId, {
        status: 'processing',
        processingStartTime: Date.now(),
        processingToken: 0,
        error: null,
        retryInfo: null,
      });

      try {
        // Add bash-input message to session
        const bashInputMsg = {
          role: 'user' as const,
          content: `<bash-input>${command}</bash-input>`,
        };
        await request('session.addMessages', {
          cwd,
          sessionId,
          messages: [bashInputMsg],
        });

        // Execute command via backend
        const result = await request('utils.tool.executeBash', {
          cwd,
          command,
        });

        // Add output message
        // API returns: { success, data: { returnDisplay, llmContent, isError? } }
        const isError = !result.success || result.error || result.data?.isError;
        const output =
          result.data?.returnDisplay ||
          result.data?.llmContent ||
          result.error?.message ||
          'Command executed (no output)';
        const bashOutputMsg = {
          role: 'user' as const,
          content: isError
            ? `<bash-stderr>${output}</bash-stderr>`
            : `<bash-stdout>${output}</bash-stdout>`,
        };
        await request('session.addMessages', {
          cwd,
          sessionId,
          messages: [bashOutputMsg],
        });

        // Reset processing state
        setSessionProcessing(sessionId, {
          status: 'idle',
          processingStartTime: null,
          processingToken: 0,
          error: null,
          retryInfo: null,
        });
      } catch (error) {
        // Handle API/network error
        toastManager.add({
          type: 'error',
          title: 'Bash execution failed',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        setSessionProcessing(sessionId, {
          status: 'idle',
          processingStartTime: null,
          processingToken: 0,
          error: null,
          retryInfo: null,
        });
      }

      return; // Don't continue to normal AI message flow
    }

    if (message && isSlashCommand(message)) {
      const parsed = parseSlashCommand(message);

      // Check backend commands
      const result = await request('slashCommand.get', {
        cwd,
        command: parsed.command,
      });
      const commandEntry = result.data?.commandEntry as CommandEntry;
      if (commandEntry) {
        const userMessage: any = {
          role: 'user',
          content: message,
        };
        const command = commandEntry.command;
        const type = command.type;
        const isLocal = type === 'local';
        const isLocalJSX = type === 'local-jsx';
        const isPrompt = type === 'prompt';
        if (isPrompt) {
          // TODO: fork parentUuid
          await request('session.addMessages', {
            cwd,
            sessionId,
            messages: [userMessage],
            parentUuid: /** fork parentUuid */ undefined,
          });
          // if (forkParentUuid) {
          //   set({
          //     forkParentUuid: null,
          //   });
          // }
        } else {
          addMessage(sessionId, userMessage);
        }
        if (isLocal || isPrompt) {
          const result = await request('slashCommand.execute', {
            cwd,
            sessionId,
            command: parsed.command,
            args: parsed.args,
          });
          if (result.success) {
            const messages: NormalizedMessage[] = result.data.messages;
            if (isPrompt) {
              await request('session.addMessages', {
                cwd,
                sessionId,
                messages,
              });
            } else {
              addMessage(sessionId, messages);
            }
          }
          if (isPrompt) {
            message = null;
            if (command.model) {
              model = command.model;
            }
          } else {
            return;
          }
        } else if (isLocalJSX) {
          // Check for local-jsx commands first (client-side)
          const localCommand = localJSXCommands.find(
            (c: { name: string }) => c.name === parsed.command,
          );
          if (localCommand) {
            const jsx = await localCommand.call(
              async (result: string | null) => {
                set((state) => ({
                  slashCommandJSXBySession: {
                    ...state.slashCommandJSXBySession,
                    [sessionId]: null,
                  },
                }));
                if (result) {
                  const { addMessage } = get();
                  addMessage(sessionId, {
                    role: 'user',
                    content: [{ type: 'text', text: result }],
                  } as any);
                }
              },
              {} as any,
              parsed.args,
            );
            set((state) => ({
              slashCommandJSXBySession: {
                ...state.slashCommandJSXBySession,
                [sessionId]: jsx,
              },
            }));
            return;
          } else {
            toastManager.add({
              type: 'error',
              title: 'Command not supported',
              description: `${parsed.command} Local JSX commands are not supported`,
            });
          }
          return;
        } else {
          toastManager.add({
            type: 'error',
            title: 'Unknown command type',
            description: `${command} Unknown slash command type: ${type}`,
          });
          return;
        }
      }
    }

    // Set session-scoped processing state
    setSessionProcessing(sessionId, {
      status: 'processing',
      processingStartTime: Date.now(),
      processingToken: 0,
      error: null,
      retryInfo: null,
    });

    // Fire-and-forget summarization on first message
    const sessionMessages = get().messages[sessionId] || [];
    const userMessages = sessionMessages.filter((m) => m.role === 'user');
    if (userMessages.length === 0 && message) {
      (async () => {
        try {
          const summary = await request('utils.summarizeMessage', {
            message,
            cwd,
          });
          if (summary.success && summary.data.text) {
            const res = JSON.parse(summary.data.text.trim());
            if (res.title) {
              await request('session.config.setSummary', {
                cwd,
                sessionId,
                summary: res.title,
              });
              updateSession(selectedWorkspaceId, sessionId, {
                summary: res.title,
              });
            }
          }
        } catch (_error) {}
      })();
    }

    try {
      // Transform params to backend format
      const planModeBoolean = params.planMode === 'plan';
      const thinking = params.think ? { effect: params.think } : undefined;
      const attachments = params.images?.map((data) => {
        const mimeMatch = data.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        return {
          type: 'image' as const,
          data,
          mimeType,
        };
      });

      // Use forkParentUuid if set, otherwise use parentUuid from params
      const { forkParentUuid } = get();
      const parentUuid = forkParentUuid || params.parentUuid;

      const response = await request('session.send', {
        message,
        sessionId,
        cwd,
        planMode: planModeBoolean,
        thinking,
        parentUuid,
        model,
        attachments,
      });

      // Clear forkParentUuid after sending
      if (forkParentUuid) {
        set({ forkParentUuid: null });
      }

      if (response.success) {
        // Reset processing state on success
        setSessionProcessing(sessionId, {
          status: 'idle',
          processingStartTime: null,
          processingToken: 0,
          error: null,
          retryInfo: null,
        });
      } else {
        // Set failed state with error message from response
        setSessionProcessing(sessionId, {
          status: 'failed',
          processingStartTime: null,
          processingToken: 0,
          error: response.error?.message || 'An error occurred',
          retryInfo: null,
        });
      }
    } catch (error) {
      // Set failed state with error message
      setSessionProcessing(sessionId, {
        status: 'failed',
        processingStartTime: null,
        processingToken: 0,
        error: error instanceof Error ? error.message : 'An error occurred',
        retryInfo: null,
      });
    }
  },

  // UI Selections
  selectRepo: (path: string | null) => {
    set((state) => {
      // Validate that the repo exists if path is not null
      if (path !== null && !state.repos[path]) {
        return state;
      }

      return {
        selectedRepoPath: path,
        // Reset child selections when parent changes
        selectedWorkspaceId: null,
        selectedSessionId: null,
      };
    });
  },

  selectWorkspace: (id: string | null) => {
    set((state) => {
      if (id === null) {
        return {
          selectedWorkspaceId: null,
          selectedSessionId: null,
        };
      }

      const workspace = state.workspaces[id];
      if (!workspace) return state;

      return {
        selectedRepoPath: workspace.repoPath,
        selectedWorkspaceId: id,
        selectedSessionId: null,
      };
    });
  },

  selectSession: (id: string | null) => {
    set(() => ({
      selectedSessionId: id,
    }));
  },

  setShowSettings: (show: boolean) => {
    set(() => ({
      showSettings: show,
    }));
  },

  setSettingsActiveTab: (tab: 'preferences' | 'providers' | 'mcp') => {
    set(() => ({
      settingsActiveTab: tab,
    }));
  },

  setOpenRepoAccordions: (ids: string[]) => {
    set(() => ({
      openRepoAccordions: ids,
    }));
  },

  toggleSessionGroupExpanded: (workspaceId: string) => {
    set((state) => ({
      expandedSessionGroups: {
        ...state.expandedSessionGroups,
        [workspaceId]: !state.expandedSessionGroups[workspaceId],
      },
    }));
  },

  setTestComponentVisible: (visible: boolean) => {
    set({ isTestComponentVisible: visible });
  },

  cancelSession: async (sessionId: string) => {
    const {
      request,
      getSessionProcessing,
      setSessionProcessing,
      workspaces,
      selectedWorkspaceId,
    } = get();
    const processing = getSessionProcessing(sessionId);

    // Only cancel if currently processing
    if (processing.status !== 'processing') {
      return;
    }

    // Get cwd from selected workspace
    const workspace = selectedWorkspaceId
      ? workspaces[selectedWorkspaceId]
      : null;
    if (!workspace) {
      console.error('No workspace found for cancel');
      return;
    }

    try {
      await request('session.cancel', {
        cwd: workspace.worktreePath,
        sessionId,
      });
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }

    // Reset processing state
    setSessionProcessing(sessionId, {
      status: 'idle',
      processingStartTime: null,
      processingToken: 0,
      retryInfo: null,
      error: null,
    });
  },

  clearSession: (sessionId: string) => {
    // Clear messages for the session
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [],
      },
      // Reset session processing state
      sessionProcessing: {
        ...state.sessionProcessing,
        [sessionId]: defaultSessionProcessingState,
      },
      // Clear agent progress state
      agentProgressMap: {},
    }));
  },

  setConnectionState: (state) => set({ state }),

  // Fork modal actions
  showForkModal: () => {
    logger.debug('[STORE]', 'showForkModal action called');
    // Small delay to let the Escape key event pass before opening the modal
    // This prevents the Dialog's built-in Escape handling from immediately closing it
    setTimeout(() => {
      logger.debug('[STORE]', 'forkModalVisible set to true (after delay)');
      set({ forkModalVisible: true });
    }, FORK_MODAL_DELAY_MS);
  },

  hideForkModal: () => {
    logger.debug('[STORE]', 'hideForkModal action called');
    set({ forkModalVisible: false });
  },

  fork: (targetMessageUuid: string) => {
    const { selectedSessionId, messages, setSessionInput } = get();

    if (!selectedSessionId) return;

    const sessionMessages = messages[selectedSessionId] || [];

    // Find the target message
    const targetMessage = sessionMessages.find(
      (m) => m.uuid === targetMessageUuid,
    );
    if (!targetMessage) {
      console.error(`Fork error: Message ${targetMessageUuid} not found`);
      return;
    }

    // Filter messages up to (but not including) the target
    const messageIndex = sessionMessages.findIndex(
      (m) => m.uuid === targetMessageUuid,
    );
    const filteredMessages = sessionMessages.slice(0, messageIndex);

    // Extract content from target message for input pre-fill
    let contentText = '';
    if (typeof targetMessage.content === 'string') {
      contentText = targetMessage.content;
    } else if (Array.isArray(targetMessage.content)) {
      const textParts = targetMessage.content
        .filter(
          (part): part is { type: 'text'; text: string } =>
            part.type === 'text',
        )
        .map((part) => part.text);
      contentText = textParts.join('');
    }

    // Extract bash-input content if present
    const bashInputMatch = contentText.match(
      /<bash-input>([\s\S]*?)<\/bash-input>/,
    );
    if (bashInputMatch) {
      contentText = bashInputMatch[1];
    }

    // Update store state
    set((state) => ({
      messages: {
        ...state.messages,
        [selectedSessionId]: filteredMessages,
      },
      forkParentUuid: targetMessage.parentUuid,
      forkModalVisible: false,
    }));

    // Pre-fill input with the target message content
    // Increment forceUpdateKey to trigger sync in useInputState
    const currentInput =
      get().inputBySession[selectedSessionId] || defaultSessionInputState;
    setSessionInput(selectedSessionId, {
      value: contentText,
      cursorPosition: contentText.length,
      forceUpdateKey: currentInput.forceUpdateKey + 1,
    });
  },

  // ==================== Slices ====================
  ...createEntitiesSlice(set, get, api),
  ...createSessionSlice(set, get, api),
  ...createConfigSlice(set, get, api),
  ...createUISlice(set, get, api),
  ...createOnboardingSlice(set, get, api),
}));

export { useStore };
export type { Store, UISlice };

// Export state types for selectors
export type { EntitiesSliceState } from './slices/entities';
export type { SessionSliceState } from './slices/session';
export type { ConfigSliceState } from './slices/config';

// Combined state type for selectors
export type StoreState = CoreState &
  import('./slices/entities').EntitiesSliceState &
  import('./slices/session').SessionSliceState &
  import('./slices/config').ConfigSliceState &
  UISlice;
