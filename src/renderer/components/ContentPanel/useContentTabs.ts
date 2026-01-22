import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  ContentTab,
  CreateTabInput,
  ContentTabType,
  TabOfType,
} from './types';

// Generate unique tab ID
function generateTabId(): string {
  return `tab-${crypto.randomUUID().slice(0, 8)}`;
}

// Persistence key for localStorage
function getPersistenceKey(repoPath: string): string {
  return `contentTabs:${repoPath}`;
}

// Load tabs from localStorage
function loadPersistedTabs(
  repoPath: string,
): { tabs: ContentTab[]; activeTabId: string | null } | null {
  try {
    const stored = localStorage.getItem(getPersistenceKey(repoPath));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[useContentTabs] Failed to load persisted tabs:', e);
  }
  return null;
}

// Save tabs to localStorage
function persistTabs(
  repoPath: string,
  tabs: ContentTab[],
  activeTabId: string | null,
): void {
  try {
    localStorage.setItem(
      getPersistenceKey(repoPath),
      JSON.stringify({ tabs, activeTabId }),
    );
  } catch (e) {
    console.error('[useContentTabs] Failed to persist tabs:', e);
  }
}

// Create default terminal tab
function createDefaultTerminalTab(): ContentTab {
  return {
    id: generateTabId(),
    type: 'terminal',
    name: 'Terminal 1',
    ptyId: null,
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

  // Queries
  getTabsByType: <T extends ContentTabType>(type: T) => TabOfType<T>[];
}

export function useContentTabs({
  repoPath,
  onTabClose,
}: UseContentTabsOptions): UseContentTabsReturn {
  // Initialize state from persistence or default
  const [state, setState] = useState<{
    tabs: ContentTab[];
    activeTabId: string | null;
  }>(() => {
    const persisted = loadPersistedTabs(repoPath);
    if (persisted) {
      return persisted;
    }
    const defaultTab = createDefaultTerminalTab();
    return { tabs: [defaultTab], activeTabId: defaultTab.id };
  });

  const { tabs, activeTabId } = state;

  // Persist on change (debounced)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = setTimeout(() => {
      persistTabs(repoPath, tabs, activeTabId);
    }, 300);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [repoPath, tabs, activeTabId]);

  // Save on unmount
  useEffect(() => {
    return () => {
      persistTabs(repoPath, tabs, activeTabId);
    };
  }, []);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const addTab = useCallback((input: CreateTabInput): string => {
    const id = generateTabId();
    const newTab = { ...input, id } as ContentTab;

    setState((prev) => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: id,
    }));

    return id;
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setState((prev) => {
        const tabToClose = prev.tabs.find((t) => t.id === tabId);
        if (tabToClose && onTabClose) {
          onTabClose(tabToClose);
        }

        const newTabs = prev.tabs.filter((t) => t.id !== tabId);

        // If closing active tab, switch to last remaining tab
        let newActiveId = prev.activeTabId;
        if (prev.activeTabId === tabId && newTabs.length > 0) {
          newActiveId = newTabs[newTabs.length - 1].id;
        } else if (newTabs.length === 0) {
          newActiveId = null;
        }

        return { tabs: newTabs, activeTabId: newActiveId };
      });
    },
    [onTabClose],
  );

  const setActiveTab = useCallback((tabId: string) => {
    setState((prev) => ({ ...prev, activeTabId: tabId }));
  }, []);

  const updateTab = useCallback(
    (tabId: string, updates: Partial<ContentTab>) => {
      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.id === tabId ? ({ ...t, ...updates } as ContentTab) : t,
        ),
      }));
    },
    [],
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
    getTabsByType,
  };
}
