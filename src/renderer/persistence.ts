import type { StoreApi } from 'zustand';
import { toastManager } from './components/ui/toast';
import { PERSISTENCE_DEBOUNCE_MS } from './constants';
import { logger } from './lib/logger';
import type { ContentPanelTab, SecondarySidebarTab } from './store/slices/ui';
import type {
  ThemeValue,
  SendMessageWith,
} from './store/slices/desktopSettings';

// Define the persistable state shape
interface PersistedState {
  repos: Record<string, any>;
  workspaces: Record<string, any>;
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  selectedSessionId: string | null;
  sessions: Record<string, any>;
  openRepoAccordions: string[];
  expandedSessionGroups: Record<string, boolean>;
  // UISlice state
  contentPanelTabs: ContentPanelTab[];
  contentPanelActiveTab: ContentPanelTab | null;
  secondarySidebarTab: SecondarySidebarTab;
  // Onboarding state
  onboardingCompleted: boolean;
  // DesktopSettings state
  theme: ThemeValue;
  sendMessageWith: SendMessageWith;
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
      selectedRepoPath: state.selectedRepoPath || null,
      selectedWorkspaceId: state.selectedWorkspaceId || null,
      selectedSessionId: state.selectedSessionId || null,
      sessions: state.sessions || {},
      openRepoAccordions: state.openRepoAccordions || [],
      expandedSessionGroups: state.expandedSessionGroups || {},
      // UISlice state
      contentPanelTabs: state.contentPanelTabs ?? ['terminal'],
      contentPanelActiveTab: state.contentPanelActiveTab ?? 'terminal',
      secondarySidebarTab: state.secondarySidebarTab ?? 'files',
      // Onboarding state
      onboardingCompleted: state.onboardingCompleted ?? false,
      // DesktopSettings state
      theme: state.theme ?? 'system',
      sendMessageWith: state.sendMessageWith ?? 'enter',
    };
  };

  // Debounced save function
  const debouncedSave = debounce(async () => {
    try {
      const persistableState = getPersistableState();
      // @ts-ignore
      await window.electron.saveStore(persistableState);
    } catch (error) {
      console.error('Failed to save store:', error);
      toastManager.add({
        type: 'error',
        title: 'Failed to save application state',
        description: (error as Error).message,
      });
    }
  }, PERSISTENCE_DEBOUNCE_MS);

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
    // @ts-ignore
    const persistedState = await window.electron.loadStore();

    // No persisted state - fresh start
    if (!persistedState) {
      return true;
    }

    // Validate and sanitize loaded state
    const {
      repos = {},
      workspaces = {},
      selectedRepoPath = null,
      selectedWorkspaceId = null,
      selectedSessionId = null,
      sessions = {},
      openRepoAccordions = [],
      expandedSessionGroups = {},
      // UISlice state
      contentPanelTabs = ['terminal'],
      contentPanelActiveTab = 'terminal',
      secondarySidebarTab = 'files',
      // Onboarding state
      onboardingCompleted = false,
      // DesktopSettings state
      theme = 'system',
      sendMessageWith = 'enter',
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

    // Merge persisted state into store
    // Note: We explicitly DON'T set connection state or runtime objects
    store.setState(
      {
        repos,
        workspaces,
        sessions,
        openRepoAccordions,
        expandedSessionGroups,
        // UISlice state
        contentPanelTabs,
        contentPanelActiveTab,
        secondarySidebarTab,

        selectedRepoPath: validatedRepoPath,
        selectedWorkspaceId: validatedWorkspaceId,
        selectedSessionId: validatedSessionId,
        state: 'idle',
        transport: null,
        messageBus: null,

        // Onboarding state
        onboardingCompleted,
        // Runtime state derived from persisted: show onboarding if not completed
        onboardingVisible: !onboardingCompleted,
        onboardingStep: 'import',
        importedProjects: [],

        // DesktopSettings state
        theme,
        sendMessageWith,
      },
      false,
    );

    logger.info(
      '[PERSIST]',
      'Store hydrated successfully from persisted state',
    );
    return true;
  } catch (error) {
    logger.error('[PERSIST]', 'Failed to hydrate store:', error);
    return false;
  }
}
