import type { StateCreator } from 'zustand';
import type {
  RepoData,
  WorkspaceData,
  SessionData,
} from '../../client/types/entities';
import type { NormalizedMessage } from '../../client/types/message';
import { randomUUID } from '../../utils/uuid';

type WorkspaceId = string;
type SessionId = string;
type RepoId = string;

export interface EntitiesSliceState {
  // Entity data
  repos: Record<RepoId, RepoData>;
  workspaces: Record<WorkspaceId, WorkspaceData>;
  sessions: Record<WorkspaceId, SessionData[]>;
  messages: Record<SessionId, NormalizedMessage[]>;
}

export interface EntitiesSliceActions {
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
  updateSession: (
    workspaceId: string,
    sessionId: string,
    updates: Partial<SessionData>,
  ) => void;
  createSession: () => string;

  // Messages
  addMessage: (
    sessionId: string,
    message: NormalizedMessage | NormalizedMessage[],
  ) => void;
  setMessages: (sessionId: string, messages: NormalizedMessage[]) => void;
}

export type EntitiesSlice = EntitiesSliceState & EntitiesSliceActions;

// Define the store shape that entities slice depends on
interface StoreWithSelections {
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  selectedSessionId: string | null;
  openRepoAccordions: string[];
  selectSession: (id: string | null) => void;
}

type EntitiesStore = EntitiesSlice & StoreWithSelections;

export const createEntitiesSlice: StateCreator<
  EntitiesStore,
  [],
  [],
  EntitiesSlice
> = (set, get) => ({
  // Initial entity data
  repos: {},
  workspaces: {},
  sessions: {},
  messages: {},

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

  // Messages
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
});
