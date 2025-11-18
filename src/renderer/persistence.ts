import type { StoreApi } from 'zustand';

// Declare electron API on window object
declare global {
  interface Window {
    electron: {
      saveStore: (state: any) => Promise<{ success: boolean }>;
      loadStore: () => Promise<any>;
    };
  }
}

// Define the persistable state shape
interface PersistedState {
  repos: Record<string, any>;
  workspaces: Record<string, any>;
  sessions: Record<string, any>;
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  selectedSessionId: string | null;
}

// Debounce helper
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): T & { flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  }) as T & { flush: () => void };

  debouncedFn.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debouncedFn;
}

/**
 * Set up automatic persistence of store state to local file system
 * @param store The Zustand store instance
 */
export function setupPersistence(store: StoreApi<any>): void {
  // Extract only persistable state (exclude runtime objects)
  const getPersistableState = (): PersistedState => {
    const state = store.getState();
    return {
      repos: state.repos || {},
      workspaces: state.workspaces || {},
      sessions: state.sessions || {},
      selectedRepoPath: state.selectedRepoPath || null,
      selectedWorkspaceId: state.selectedWorkspaceId || null,
      selectedSessionId: state.selectedSessionId || null,
    };
  };

  // Debounced save function
  const debouncedSave = debounce(async () => {
    try {
      const persistableState = getPersistableState();
      await window.electron.saveStore(persistableState);
    } catch (error) {
      console.error('Failed to save store:', error);
      window.alert(
        `Failed to save application state: ${(error as Error).message}`,
      );
    }
  }, 500);

  // Subscribe to store changes
  store.subscribe(() => {
    debouncedSave();
  });

  // Flush any pending saves before app closes
  window.addEventListener('beforeunload', () => {
    debouncedSave.flush();
  });
}

/**
 * Load persisted state and hydrate the store
 * @param store The Zustand store instance
 * @returns true if hydration succeeded, false otherwise
 */
export async function hydrateStore(store: StoreApi<any>): Promise<boolean> {
  try {
    const persistedState = await window.electron.loadStore();

    // No persisted state - fresh start
    if (!persistedState) {
      return true;
    }

    // Validate and sanitize loaded state
    const {
      repos = {},
      workspaces = {},
      sessions = {},
      selectedRepoPath = null,
      selectedWorkspaceId = null,
      selectedSessionId = null,
    } = persistedState;

    // Validate selections exist in loaded entities
    let validatedRepoPath = selectedRepoPath;
    let validatedWorkspaceId = selectedWorkspaceId;
    let validatedSessionId = selectedSessionId;

    // Check if selected repo exists
    if (validatedRepoPath && !repos[validatedRepoPath]) {
      console.warn(
        `Selected repo path ${validatedRepoPath} not found in loaded repos, resetting selection`,
      );
      validatedRepoPath = null;
    }

    // Check if selected workspace exists
    if (validatedWorkspaceId && !workspaces[validatedWorkspaceId]) {
      console.warn(
        `Selected workspace ID ${validatedWorkspaceId} not found in loaded workspaces, resetting selection`,
      );
      validatedWorkspaceId = null;
    }

    // Check if selected session exists
    if (validatedSessionId && !sessions[validatedSessionId]) {
      console.warn(
        `Selected session ID ${validatedSessionId} not found in loaded sessions, resetting selection`,
      );
      validatedSessionId = null;
    }

    // Merge persisted state into store
    // Note: We explicitly DON'T set connection state or runtime objects
    store.setState(
      {
        repos,
        workspaces,
        sessions,
        selectedRepoPath: validatedRepoPath,
        selectedWorkspaceId: validatedWorkspaceId,
        selectedSessionId: validatedSessionId,
        state: 'disconnected',
        transport: null,
        messageBus: null,
      },
      false,
    );

    console.log('Store hydrated successfully from persisted state');
    return true;
  } catch (error) {
    console.error('Failed to hydrate store:', error);
    return false;
  }
}
