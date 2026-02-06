import type { StateCreator } from 'zustand';
import type {
  ContentTab,
  CreateTabInput,
} from '../../components/ContentPanel/types';
import { generateTabId } from '../../lib/utils';

export type SecondarySidebarTab = 'files' | 'git';
export type SidebarOrganize = 'byProject' | 'chronological';
export type SidebarSortBy = 'created' | 'updated';

// Content Panel Tabs state and actions (namespaced)
export interface ContentPanelTabsState {
  tabsByRepo: Record<string, ContentTab[]>;
  activeTabIdByRepo: Record<string, string | null>;

  // Actions
  open: (input: CreateTabInput, repoPath?: string) => ContentTab | null;
  close: (tabId: string, repoPath?: string) => void;
  activate: (tabId: string, repoPath?: string) => void;
  update: (
    tabId: string,
    updates: Partial<ContentTab>,
    repoPath?: string,
  ) => void;
  reorder: (fromIndex: number, toIndex: number, repoPath?: string) => void;
  initForRepo: (
    repoPath: string,
    tabs: ContentTab[],
    activeTabId: string | null,
  ) => void;
}

export interface UISlice {
  // Content Panel Tabs (namespaced)
  contentPanelTabs: ContentPanelTabsState;

  // Secondary Sidebar (files, git)
  secondarySidebarTab: SecondarySidebarTab;
  setSecondarySidebarTab: (tab: SecondarySidebarTab) => void;

  // Sidebar filter settings
  sidebarOrganize: SidebarOrganize;
  sidebarSortBy: SidebarSortBy;
  setSidebarOrganize: (organize: SidebarOrganize) => void;
  setSidebarSortBy: (sortBy: SidebarSortBy) => void;
}

// Define the store shape that UI slice depends on
interface StoreWithSelections {
  selectedRepoPath: string | null;
}

type UIStore = UISlice & StoreWithSelections;

export const createUISlice: StateCreator<UIStore, [], [], UISlice> = (
  set,
  get,
) => ({
  // Content Panel Tabs (namespaced)
  contentPanelTabs: {
    tabsByRepo: {},
    activeTabIdByRepo: {},

    open: (input, repoPath) => {
      const effectiveRepoPath = repoPath ?? get().selectedRepoPath;
      if (!effectiveRepoPath) {
        console.warn('[contentPanelTabs] open called without repoPath');
        return null;
      }

      const id = generateTabId();
      const newTab = { ...input, id } as ContentTab;

      set((state) => {
        const currentTabs =
          state.contentPanelTabs.tabsByRepo[effectiveRepoPath] ?? [];
        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            tabsByRepo: {
              ...state.contentPanelTabs.tabsByRepo,
              [effectiveRepoPath]: [...currentTabs, newTab],
            },
            activeTabIdByRepo: {
              ...state.contentPanelTabs.activeTabIdByRepo,
              [effectiveRepoPath]: id,
            },
          },
        };
      });

      return newTab;
    },

    close: (tabId, repoPath) => {
      const effectiveRepoPath = repoPath ?? get().selectedRepoPath;
      if (!effectiveRepoPath) {
        console.warn('[contentPanelTabs] close called without repoPath');
        return;
      }

      set((state) => {
        const currentTabs =
          state.contentPanelTabs.tabsByRepo[effectiveRepoPath] ?? [];
        const newTabs = currentTabs.filter((t) => t.id !== tabId);

        // If closing active tab, switch to last remaining tab
        let newActiveId =
          state.contentPanelTabs.activeTabIdByRepo[effectiveRepoPath];
        if (newActiveId === tabId) {
          newActiveId =
            newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }

        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            tabsByRepo: {
              ...state.contentPanelTabs.tabsByRepo,
              [effectiveRepoPath]: newTabs,
            },
            activeTabIdByRepo: {
              ...state.contentPanelTabs.activeTabIdByRepo,
              [effectiveRepoPath]: newActiveId,
            },
          },
        };
      });
    },

    activate: (tabId, repoPath) => {
      const effectiveRepoPath = repoPath ?? get().selectedRepoPath;
      if (!effectiveRepoPath) {
        console.warn('[contentPanelTabs] activate called without repoPath');
        return;
      }

      set((state) => {
        const tabs = state.contentPanelTabs.tabsByRepo[effectiveRepoPath] ?? [];
        if (!tabs.some((t) => t.id === tabId)) {
          return state;
        }

        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            activeTabIdByRepo: {
              ...state.contentPanelTabs.activeTabIdByRepo,
              [effectiveRepoPath]: tabId,
            },
          },
        };
      });
    },

    update: (tabId, updates, repoPath) => {
      const effectiveRepoPath = repoPath ?? get().selectedRepoPath;
      if (!effectiveRepoPath) {
        console.warn('[contentPanelTabs] update called without repoPath');
        return;
      }

      set((state) => {
        const currentTabs =
          state.contentPanelTabs.tabsByRepo[effectiveRepoPath] ?? [];
        const newTabs = currentTabs.map((t) =>
          t.id === tabId ? ({ ...t, ...updates } as ContentTab) : t,
        );

        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            tabsByRepo: {
              ...state.contentPanelTabs.tabsByRepo,
              [effectiveRepoPath]: newTabs,
            },
          },
        };
      });
    },

    reorder: (fromIndex, toIndex, repoPath) => {
      const effectiveRepoPath = repoPath ?? get().selectedRepoPath;
      if (!effectiveRepoPath) {
        console.warn('[contentPanelTabs] reorder called without repoPath');
        return;
      }

      set((state) => {
        const currentTabs = [
          ...(state.contentPanelTabs.tabsByRepo[effectiveRepoPath] ?? []),
        ];
        const [movedTab] = currentTabs.splice(fromIndex, 1);
        if (movedTab) {
          currentTabs.splice(toIndex, 0, movedTab);
        }

        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            tabsByRepo: {
              ...state.contentPanelTabs.tabsByRepo,
              [effectiveRepoPath]: currentTabs,
            },
          },
        };
      });
    },

    initForRepo: (repoPath, tabs, activeTabId) => {
      set((state) => {
        // Skip if already initialized
        if (repoPath in state.contentPanelTabs.tabsByRepo) {
          return state;
        }

        return {
          contentPanelTabs: {
            ...state.contentPanelTabs,
            tabsByRepo: {
              ...state.contentPanelTabs.tabsByRepo,
              [repoPath]: tabs,
            },
            activeTabIdByRepo: {
              ...state.contentPanelTabs.activeTabIdByRepo,
              [repoPath]: activeTabId ?? (tabs.length > 0 ? tabs[0].id : null),
            },
          },
        };
      });
    },
  },

  // Secondary Sidebar
  secondarySidebarTab: 'files',
  setSecondarySidebarTab: (tab) => set({ secondarySidebarTab: tab }),

  // Sidebar filter settings
  sidebarOrganize: 'byProject',
  sidebarSortBy: 'updated',
  setSidebarOrganize: (organize) => set({ sidebarOrganize: organize }),
  setSidebarSortBy: (sortBy) => set({ sidebarSortBy: sortBy }),
});
