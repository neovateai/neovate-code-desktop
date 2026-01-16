import React from 'react';
import type { StateCreator } from 'zustand';

type WorkspaceId = string;
type SessionId = string;

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
  // Incremented when value is set externally (e.g., from fork) to trigger sync
  forceUpdateKey: number;
}

export const defaultSessionInputState: SessionInputState = {
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
  forceUpdateKey: 0,
};

export function getInputMode(value: string): InputMode {
  if (value.startsWith('!')) return 'bash';
  if (value.startsWith('#')) return 'memory';
  return 'prompt';
}

// Session-scoped processing state
export interface SessionProcessingState {
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

export const defaultSessionProcessingState: SessionProcessingState = {
  status: 'idle',
  processingStartTime: null,
  processingToken: 0,
  error: null,
  retryInfo: null,
};

export interface SessionSliceState {
  // Session-scoped processing state
  sessionProcessing: Record<SessionId, SessionProcessingState>;

  // Session-scoped input state
  inputBySession: Record<SessionId, SessionInputState>;

  // Workspace-scoped history
  historyByWorkspace: Record<WorkspaceId, string[]>;

  // Local JSX slash command state
  slashCommandJSXBySession: Record<SessionId, React.ReactNode | null>;
}

export interface SessionSliceActions {
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

  // Local JSX slash command actions
  setSlashCommandJSX: (sessionId: string, jsx: React.ReactNode | null) => void;
}

export type SessionSlice = SessionSliceState & SessionSliceActions;

export const createSessionSlice: StateCreator<
  SessionSlice,
  [],
  [],
  SessionSlice
> = (set, get) => ({
  // Initial session processing state
  sessionProcessing: {},

  // Initial session input state
  inputBySession: {},

  // Initial workspace history
  historyByWorkspace: {},

  // Initial local JSX slash command state
  slashCommandJSXBySession: {},

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

  setSlashCommandJSX: (sessionId: string, jsx: React.ReactNode | null) => {
    set((state) => ({
      slashCommandJSXBySession: {
        ...state.slashCommandJSXBySession,
        [sessionId]: jsx,
      },
    }));
  },
});
