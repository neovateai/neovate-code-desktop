import { useCallback, useEffect } from 'react';
import { generateTabId } from '../../lib/utils';
import { useStore } from '../../store';
import type {
  ContentTab,
  ContentTabType,
  CreateTabInput,
  TabOfType,
} from './types';

// Stable empty array to avoid re-renders
const EMPTY_TABS: ContentTab[] = [];

// Create default terminal tab
function createDefaultTerminalTab(): ContentTab {
  return {
    id: generateTabId(),
    type: 'terminal',
    name: 'Terminal',
    ptyId: null,
  };
}

// Create default editor tab
function createDefaultEditorTab(): ContentTab {
  return {
    id: generateTabId(),
    type: 'editor',
    name: 'Editor',
    filePath: '',
    isDirty: false,
  };
}

function createDefaultBrowserTab(): ContentTab {
  return {
    id: generateTabId(),
    type: 'browser',
    name: 'Browser',
  };
}

export interface UseContentTabsOptions {
  repoPath: string;
  onTabClose?: (tab: ContentTab) => void;
}

export interface UseContentTabsReturn {
  // State
  tabs: ContentTab[];
  activeTabId: string | null;
  activeTab: ContentTab | null;

  // Actions
  addTab: (input: CreateTabInput) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<ContentTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Queries
  getTabsByType: <T extends ContentTabType>(type: T) => TabOfType<T>[];
}

export function useContentTabs({
  repoPath,
  onTabClose,
}: UseContentTabsOptions): UseContentTabsReturn {
  // Read from store (namespaced under contentPanelTabs)
  const tabs = useStore(
    (state) => state.contentPanelTabs.tabsByRepo[repoPath] ?? EMPTY_TABS,
  );
  const activeTabId = useStore(
    (state) => state.contentPanelTabs.activeTabIdByRepo[repoPath] ?? null,
  );
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Store actions
  const { open, close, activate, update, reorder, initForRepo } = useStore(
    (state) => state.contentPanelTabs,
  );

  // Initialize default tabs if repo not in store
  useEffect(() => {
    const isInitialized =
      repoPath in useStore.getState().contentPanelTabs.tabsByRepo;
    if (!isInitialized) {
      const defaultTerminal = createDefaultTerminalTab();
      const defaultEditor = createDefaultEditorTab();
      initForRepo(
        repoPath,
        [defaultEditor, defaultTerminal, createDefaultBrowserTab()],
        defaultEditor.id,
      );
    }
  }, [repoPath, initForRepo]);

  // No localStorage logic - persistence handled by Store's setupPersistence()

  // Wrap actions with repoPath
  const addTab = useCallback(
    (input: CreateTabInput): string => {
      const result = open(input, repoPath);
      return result?.id ?? '';
    },
    [open, repoPath],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      // Call onTabClose callback before closing
      const tabToClose = useStore
        .getState()
        .contentPanelTabs.tabsByRepo[repoPath]?.find((t) => t.id === tabId);
      if (tabToClose && onTabClose) {
        onTabClose(tabToClose);
      }
      close(tabId, repoPath);
    },
    [close, repoPath, onTabClose],
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      activate(tabId, repoPath);
    },
    [activate, repoPath],
  );

  const updateTab = useCallback(
    (tabId: string, updates: Partial<ContentTab>) => {
      update(tabId, updates, repoPath);
    },
    [update, repoPath],
  );

  const reorderTabs = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorder(fromIndex, toIndex, repoPath);
    },
    [reorder, repoPath],
  );

  const getTabsByType = useCallback(
    <T extends ContentTabType>(type: T): TabOfType<T>[] => {
      return tabs.filter((t): t is TabOfType<T> => t.type === type);
    },
    [tabs],
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    closeTab,
    setActiveTab,
    updateTab,
    reorderTabs,
    getTabsByType,
  };
}
