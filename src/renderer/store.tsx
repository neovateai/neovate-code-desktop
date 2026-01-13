import React from 'react';
import { create } from 'zustand';
import { WebSocketTransport } from './client/transport/WebSocketTransport';
import { MessageBus } from './client/messaging/MessageBus';
import { randomUUID } from './utils/uuid';
import { getNestedValue, setNestedValue } from './lib/utils';
import { toastManager } from './components/ui/toast';
import type {
  RepoData,
  WorkspaceData,
  SessionData,
} from './client/types/entities';
import type { NormalizedMessage } from './client/types/message';
import type {
  HandlerMap,
  HandlerMethod,
  HandlerInput,
  HandlerOutput,
} from './nodeBridge.types';
import {
  isSlashCommand,
  parseSlashCommand,
  type CommandEntry,
} from './slashCommand';
import { localJSXCommands } from './slash-commands';

type WorkspaceId = string;
type SessionId = string;
type RepoId = string;

// Input mode types
export type InputMode = 'prompt' | 'bash' | 'memory';
export type PlanMode = 'normal' | 'plan' | 'brainstorm';
export type ThinkingLevel = null | 'low' | 'medium' | 'high';

// Session-scoped input state
export interface SessionInputState {
  value: string;
  cursorPosition: number;
  historyIndex: number | null;
  draftInput: string;
  planMode: PlanMode;
  thinking: ThinkingLevel;
  thinkingEnabled: boolean;
  thinkingInitialized: boolean;
  pastedTextMap: Record<string, string>;
  pastedImageMap: Record<string, string>;
}

const defaultSessionInputState: SessionInputState = {
  value: '',
  cursorPosition: 0,
  historyIndex: null,
  draftInput: '',
  planMode: 'normal',
  thinking: null,
  thinkingEnabled: false,
  thinkingInitialized: false,
  pastedTextMap: {},
  pastedImageMap: {},
};

export function getInputMode(value: string): InputMode {
  if (value.startsWith('!')) return 'bash';
  if (value.startsWith('#')) return 'memory';
  return 'prompt';
}

// Session-scoped processing state
interface SessionProcessingState {
  status: 'idle' | 'processing' | 'failed';
  processingStartTime: number | null;
  processingToken: number;
  error: string | null;
  retryInfo: {
    currentRetry: number;
    maxRetries: number;
    error: string | null;
  } | null;
}

const defaultSessionProcessingState: SessionProcessingState = {
  status: 'idle',
  processingStartTime: null,
  processingToken: 0,
  error: null,
  retryInfo: null,
};

interface StoreState {
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

  // Entity data
  repos: Record<RepoId, RepoData>;
  workspaces: Record<WorkspaceId, WorkspaceData>;
  sessions: Record<WorkspaceId, SessionData[]>;
  messages: Record<SessionId, NormalizedMessage[]>;

  // Session-scoped processing state
  sessionProcessing: Record<SessionId, SessionProcessingState>;

  // Session-scoped input state
  inputBySession: Record<SessionId, SessionInputState>;

  // Workspace-scoped history
  historyByWorkspace: Record<WorkspaceId, string[]>;

  // UI state
  selectedRepoPath: string | null;
  selectedWorkspaceId: WorkspaceId | null;
  selectedSessionId: SessionId | null;
  showSettings: boolean;
  sidebarCollapsed: boolean;
  openRepoAccordions: string[];
  expandedSessionGroups: Record<string, boolean>;
  isTestComponentVisible: boolean;

  // Config state
  globalConfig: Record<string, any> | null;
  isConfigLoading: boolean;
  isConfigSaving: boolean;

  // File and command caches
  filesByWorkspace: Record<WorkspaceId, string[]>;
  slashCommandsByWorkspace: Record<WorkspaceId, any[]>;

  // Local JSX slash command state
  slashCommandJSXBySession: Record<SessionId, React.ReactNode | null>;
}

interface StoreActions {
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

  // Session processing state helpers
  getSessionProcessing: (sessionId: string) => SessionProcessingState;
  setSessionProcessing: (
    sessionId: string,
    state: Partial<SessionProcessingState>,
  ) => void;

  // Session input state helpers
  getSessionInput: (sessionId: string) => SessionInputState;
  setSessionInput: (
    sessionId: string,
    state: Partial<SessionInputState>,
  ) => void;
  resetSessionInput: (sessionId: string) => void;

  // Workspace history helpers
  addToWorkspaceHistory: (workspaceId: string, input: string) => void;
  getWorkspaceHistory: (workspaceId: string) => string[];

  // Entity CRUD operations
  // Repos
  addRepo: (repo: RepoData) => void;
  updateRepo: (path: string, updates: Partial<RepoData>) => void;
  deleteRepo: (path: string) => void;

  // Workspaces
  addWorkspace: (workspace: WorkspaceData) => void;
  updateWorkspace: (id: string, updates: Partial<WorkspaceData>) => void;
  deleteWorkspace: (id: string) => void;

  // Sessions
  setSessions: (workspaceId: string, sessions: SessionData[]) => void;
  addMessage: (
    sessionId: string,
    message: NormalizedMessage | NormalizedMessage[],
  ) => void;
  setMessages: (sessionId: string, messages: NormalizedMessage[]) => void;
  createSession: () => string;
  updateSession: (
    workspaceId: string,
    sessionId: string,
    updates: Partial<SessionData>,
  ) => void;

  // UI Selections
  selectRepo: (path: string | null) => void;
  selectWorkspace: (id: string | null) => void;
  selectSession: (id: string | null) => void;
  setShowSettings: (show: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setOpenRepoAccordions: (ids: string[]) => void;
  toggleSessionGroupExpanded: (workspaceId: string) => void;
  setTestComponentVisible: (visible: boolean) => void;

  // Config actions
  loadGlobalConfig: () => Promise<void>;
  getGlobalConfigValue: <T>(key: string, defaultValue?: T) => T | undefined;
  setGlobalConfig: (key: string, value: any) => Promise<boolean>;

  // File and command cache actions
  fetchFileList: (workspaceId: string) => Promise<string[]>;
  fetchSlashCommandList: (workspaceId: string) => Promise<any[]>;

  // Session control actions
  cancelSession: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;

  // Local JSX slash command actions
  setSlashCommandJSX: (sessionId: string, jsx: React.ReactNode | null) => void;

  // Connection state setter
  setConnectionState: (state: StoreState['state']) => void;
}

type Store = StoreState & StoreActions;

const useStore = create<Store>()((set, get) => ({
  // Initial WebSocket state
  state: 'idle',
  transport: null,
  messageBus: null,
  initialized: false,

  // Initial server URL
  serverUrl: null,

  // Initial entity data
  repos: {},
  workspaces: {},
  sessions: {},
  messages: {},

  // Initial session processing state
  sessionProcessing: {},

  // Initial session input state
  inputBySession: {},

  // Initial workspace history
  historyByWorkspace: {},

  // Initial UI state
  selectedRepoPath: null,
  selectedWorkspaceId: null,
  selectedSessionId: null,
  showSettings: false,
  sidebarCollapsed: false,
  openRepoAccordions: [],
  expandedSessionGroups: {},
  isTestComponentVisible: false,

  // Initial config state
  globalConfig: null,
  isConfigLoading: false,
  isConfigSaving: false,

  // Initial file and command cache state
  filesByWorkspace: {},
  slashCommandsByWorkspace: {},

  // Initial local JSX slash command state
  slashCommandJSXBySession: {},

  connect: async () => {
    const { transport, serverUrl } = get();
    if (transport?.isConnected()) {
      return;
    }

    set({ state: 'connecting' });

    const url = serverUrl ?? 'ws://localhost:1024/ws';

    try {
      const newTransport = new WebSocketTransport({
        url,
        reconnectInterval: 1000,
        maxReconnectInterval: 30000,
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

    console.log('[REQUEST]', method, params);
    const response = await messageBus.request<
      HandlerInput<K>,
      HandlerOutput<K>
    >(method, params);
    console.log('[RESPONSE]', method, response);
    return response;
  },

  onEvent: <T,>(event: string, handler: (data: T) => void) => {
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
      console.log('Already initialized, skipping');
      return;
    }

    await loadGlobalConfig();

    onEvent('message', (data: any) => {
      if (data.message && data.sessionId) {
        addMessage(data.sessionId, data.message);
      }
    });

    onEvent('chunk', (data: any) => {
      // Increment token count for the session
      if (data.sessionId) {
        const { setSessionProcessing, getSessionProcessing } = get();
        const current = getSessionProcessing(data.sessionId);
        setSessionProcessing(data.sessionId, {
          processingToken: current.processingToken + 1,
        });
      }
    });

    onEvent('streamResult', (data: any) => {
      console.log('streamResult', data);
      // Update retry info if present
      if (data.sessionId && data.retryInfo) {
        const { setSessionProcessing } = get();
        setSessionProcessing(data.sessionId, {
          retryInfo: data.retryInfo,
        });
      }
    });

    set({ initialized: true });
  },

  setUrl: (url) => set({ serverUrl: url }),

  getSessionProcessing: (sessionId: string): SessionProcessingState => {
    const { sessionProcessing } = get();
    return sessionProcessing[sessionId] || defaultSessionProcessingState;
  },

  setSessionProcessing: (
    sessionId: string,
    state: Partial<SessionProcessingState>,
  ) => {
    set((prev) => ({
      sessionProcessing: {
        ...prev.sessionProcessing,
        [sessionId]: {
          ...(prev.sessionProcessing[sessionId] ||
            defaultSessionProcessingState),
          ...state,
        },
      },
    }));
  },

  getSessionInput: (sessionId: string): SessionInputState => {
    const { inputBySession } = get();
    return inputBySession[sessionId] || defaultSessionInputState;
  },

  setSessionInput: (sessionId: string, state: Partial<SessionInputState>) => {
    set((prev) => ({
      inputBySession: {
        ...prev.inputBySession,
        [sessionId]: {
          ...(prev.inputBySession[sessionId] || defaultSessionInputState),
          ...state,
        },
      },
    }));
  },

  resetSessionInput: (sessionId: string) => {
    set((prev) => ({
      inputBySession: {
        ...prev.inputBySession,
        [sessionId]: {
          ...defaultSessionInputState,
          // but keep thinking and thinkingEnabled
          thinking: prev.inputBySession[sessionId]?.thinking || null,
          thinkingEnabled:
            prev.inputBySession[sessionId]?.thinkingEnabled || false,
          planMode: prev.inputBySession[sessionId]?.planMode || 'normal',
        },
      },
    }));
  },

  addToWorkspaceHistory: (workspaceId: string, input: string) => {
    set((prev) => ({
      historyByWorkspace: {
        ...prev.historyByWorkspace,
        [workspaceId]: [...(prev.historyByWorkspace[workspaceId] || []), input],
      },
    }));
  },

  getWorkspaceHistory: (workspaceId: string): string[] => {
    const { historyByWorkspace } = get();
    return historyByWorkspace[workspaceId] || [];
  },

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

      const response = await request('session.send', {
        message,
        sessionId,
        cwd,
        planMode: planModeBoolean,
        thinking,
        parentUuid: params.parentUuid,
        model,
        attachments,
      });

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

  // Entity CRUD operations
  // Repos
  addRepo: (repo: RepoData) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [repo.path]: repo,
      },
      openRepoAccordions: state.openRepoAccordions.includes(repo.path)
        ? state.openRepoAccordions
        : [...state.openRepoAccordions, repo.path],
    }));
  },

  updateRepo: (path: string, updates: Partial<RepoData>) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [path]: {
          ...state.repos[path],
          ...updates,
        },
      },
    }));
  },

  deleteRepo: (path: string) => {
    set((state) => {
      // Get the repo to delete
      const repo = state.repos[path];
      if (!repo) return state;

      // Delete all workspaces for this repo (cascading)
      const newWorkspaces = { ...state.workspaces };

      repo.workspaceIds.forEach((workspaceId) => {
        if (state.workspaces[workspaceId]) {
          delete newWorkspaces[workspaceId];
        }
      });

      // Delete the repo
      const newRepos = { ...state.repos };
      delete newRepos[path];

      // Clear UI selections if needed
      let selectedRepoPath = state.selectedRepoPath;
      let selectedWorkspaceId = state.selectedWorkspaceId;
      let selectedSessionId = state.selectedSessionId;

      if (selectedRepoPath === path) {
        selectedRepoPath = null;
        selectedWorkspaceId = null;
        selectedSessionId = null;
      }

      return {
        repos: newRepos,
        workspaces: newWorkspaces,
        selectedRepoPath,
        selectedWorkspaceId,
        selectedSessionId,
      };
    });
  },

  // Workspaces
  addWorkspace: (workspace: WorkspaceData) => {
    set((state) => {
      // Add the workspace
      const newWorkspaces = {
        ...state.workspaces,
        [workspace.id]: workspace,
      };

      // Add the workspace ID to the parent repo
      const repo = state.repos[workspace.repoPath];
      if (repo && !repo.workspaceIds.includes(workspace.id)) {
        const newRepos = {
          ...state.repos,
          [workspace.repoPath]: {
            ...repo,
            workspaceIds: [workspace.id, ...repo.workspaceIds],
          },
        };

        return {
          repos: newRepos,
          workspaces: newWorkspaces,
        };
      }

      return {
        workspaces: newWorkspaces,
      };
    });
  },

  updateWorkspace: (id: string, updates: Partial<WorkspaceData>) => {
    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [id]: {
          ...state.workspaces[id],
          ...updates,
        },
      },
    }));
  },

  deleteWorkspace: (id: string) => {
    set((state) => {
      // Get the workspace to delete
      const workspace = state.workspaces[id];
      if (!workspace) return state;

      // Remove the workspace ID from the parent repo
      const repo = state.repos[workspace.repoPath];
      if (repo) {
        const newRepos = {
          ...state.repos,
          [workspace.repoPath]: {
            ...repo,
            workspaceIds: repo.workspaceIds.filter((wid) => wid !== id),
          },
        };

        // Delete the workspace
        const newWorkspaces = { ...state.workspaces };
        delete newWorkspaces[id];

        // Clear UI selections if needed
        let selectedWorkspaceId = state.selectedWorkspaceId;
        let selectedSessionId = state.selectedSessionId;

        if (selectedWorkspaceId === id) {
          selectedWorkspaceId = null;
          selectedSessionId = null;
        }

        return {
          repos: newRepos,
          workspaces: newWorkspaces,
          selectedWorkspaceId,
          selectedSessionId,
        };
      }

      // If no repo found, just delete the workspace
      const newWorkspaces = { ...state.workspaces };
      delete newWorkspaces[id];

      // Clear UI selections if needed
      let selectedWorkspaceId = state.selectedWorkspaceId;
      let selectedSessionId = state.selectedSessionId;

      if (selectedWorkspaceId === id) {
        selectedWorkspaceId = null;
        selectedSessionId = null;
      }

      return {
        workspaces: newWorkspaces,
        selectedWorkspaceId,
        selectedSessionId,
      };
    });
  },

  // Sessions
  setSessions: (workspaceId: string, sessions: SessionData[]) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [workspaceId]: sessions,
      },
    }));
  },

  updateSession: (
    workspaceId: string,
    sessionId: string,
    updates: Partial<SessionData>,
  ) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [workspaceId]: state.sessions[workspaceId].map((s) =>
          s.sessionId === sessionId ? { ...s, ...updates } : s,
        ),
      },
    }));
  },

  addMessage: (
    sessionId: string,
    message: NormalizedMessage | NormalizedMessage[],
  ) => {
    const messages = Array.isArray(message) ? message : [message];
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), ...messages],
      },
    }));
  },

  setMessages: (sessionId: string, messages: NormalizedMessage[]) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: messages,
      },
    }));
  },

  createSession: () => {
    const { selectedWorkspaceId, sessions, setSessions, selectSession } = get();

    if (!selectedWorkspaceId) {
      throw new Error('No workspace selected to create session');
    }

    const newSessionId = randomUUID();
    setSessions(selectedWorkspaceId, [
      {
        sessionId: newSessionId,
        modified: Date.now(),
        created: Date.now(),
        messageCount: 0,
        summary: 'New session',
      },
      ...(sessions[selectedWorkspaceId] || []),
    ]);
    selectSession(newSessionId);
    return newSessionId;
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

  toggleSidebar: () => {
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set(() => ({
      sidebarCollapsed: collapsed,
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

  // Config actions
  loadGlobalConfig: async () => {
    const { globalConfig, isConfigLoading } = get();

    // Skip if already loading or already loaded
    if (isConfigLoading || globalConfig !== null) {
      return;
    }

    set({ isConfigLoading: true });

    try {
      const { request } = get();
      const response = await request('config.list', { cwd: '/tmp' });

      if (response.success && response.data?.config) {
        set({ globalConfig: response.data.config as Record<string, any> });
      } else {
        // Set to empty object if no config exists
        set({ globalConfig: {} });
      }
    } catch (error) {
      console.error('Failed to load global config:', error);
      set({ globalConfig: {} });
    } finally {
      set({ isConfigLoading: false });
    }
  },

  getGlobalConfigValue: <T,>(key: string, defaultValue?: T): T | undefined => {
    const { globalConfig } = get();
    return getNestedValue<T>(globalConfig, key, defaultValue);
  },

  setGlobalConfig: async (key: string, value: any): Promise<boolean> => {
    const { globalConfig, isConfigSaving, request } = get();

    if (isConfigSaving) {
      return false;
    }

    // Store previous value for rollback
    const previousConfig = globalConfig ? { ...globalConfig } : null;

    // Optimistic update
    const newConfig = globalConfig
      ? setNestedValue(globalConfig, key, value)
      : setNestedValue({}, key, value);

    set({
      globalConfig: newConfig,
      isConfigSaving: true,
    });

    try {
      const response = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key,
        value,
      });

      if (!response.success) {
        // Rollback on failure
        set({ globalConfig: previousConfig });
        console.error('Failed to save config:', response);
        return false;
      }

      return true;
    } catch (error) {
      // Rollback on error
      set({ globalConfig: previousConfig });
      console.error('Failed to save config:', error);
      return false;
    } finally {
      set({ isConfigSaving: false });
    }
  },

  fetchFileList: async (workspaceId: string) => {
    const { filesByWorkspace, workspaces, request } = get();

    // Return cached if exists
    if (filesByWorkspace[workspaceId]) {
      return filesByWorkspace[workspaceId];
    }

    const workspace = workspaces[workspaceId];
    if (!workspace) return [];

    try {
      const response = await request('utils.getPaths', {
        cwd: workspace.worktreePath,
      });
      if (response.success) {
        const files = response.data.paths;
        set((state) => ({
          filesByWorkspace: { ...state.filesByWorkspace, [workspaceId]: files },
        }));
        return files;
      }
    } catch (error) {
      console.error('Failed to fetch file list:', error);
    }
    return [];
  },

  fetchSlashCommandList: async (workspaceId: string) => {
    const { slashCommandsByWorkspace, workspaces, request } = get();

    // Return cached if exists
    if (slashCommandsByWorkspace[workspaceId]) {
      return slashCommandsByWorkspace[workspaceId];
    }

    const workspace = workspaces[workspaceId];
    if (!workspace) return [];

    try {
      const response = await request('slashCommand.list', {
        cwd: workspace.worktreePath,
      });
      if (response.success) {
        const commands = response.data.slashCommands.map((cmd: any) => ({
          name: cmd.command.name,
          description: cmd.command.description,
        }));
        set((state) => ({
          slashCommandsByWorkspace: {
            ...state.slashCommandsByWorkspace,
            [workspaceId]: commands,
          },
        }));
        return commands;
      }
    } catch (error) {
      console.error('Failed to fetch slash command list:', error);
    }
    return [];
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
    }));
  },

  setSlashCommandJSX: (sessionId: string, jsx: React.ReactNode | null) => {
    set((state) => ({
      slashCommandJSXBySession: {
        ...state.slashCommandJSXBySession,
        [sessionId]: jsx,
      },
    }));
  },

  setConnectionState: (state) => set({ state }),
}));

export { useStore, defaultSessionInputState };
export type { Store, StoreState, StoreActions, SessionProcessingState };
