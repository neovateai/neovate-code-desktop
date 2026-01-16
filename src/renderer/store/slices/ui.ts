import type { StateCreator } from 'zustand';

export type ContentPanelTab = 'terminal';
export type SecondarySidebarTab = 'files' | 'git';

export interface UISlice {
  // Content Panel (terminal, logs, etc.) - supports multiple open tabs
  contentPanelTabs: ContentPanelTab[];
  contentPanelActiveTab: ContentPanelTab | null;
  openContentPanelTab: (tab: ContentPanelTab) => void;
  closeContentPanelTab: (tab: ContentPanelTab) => void;
  setContentPanelActiveTab: (tab: ContentPanelTab) => void;

  // Secondary Sidebar (files, git)
  secondarySidebarTab: SecondarySidebarTab;
  setSecondarySidebarTab: (tab: SecondarySidebarTab) => void;
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // Content Panel - multiple tabs support
  contentPanelTabs: ['terminal'],
  contentPanelActiveTab: 'terminal',
  openContentPanelTab: (tab) =>
    set((state) => ({
      contentPanelTabs: state.contentPanelTabs.includes(tab)
        ? state.contentPanelTabs
        : [...state.contentPanelTabs, tab],
      contentPanelActiveTab: tab,
    })),
  closeContentPanelTab: (tab) =>
    set((state) => {
      const newTabs = state.contentPanelTabs.filter((t) => t !== tab);
      const newActiveTab =
        state.contentPanelActiveTab === tab
          ? (newTabs[newTabs.length - 1] ?? null)
          : state.contentPanelActiveTab;
      return { contentPanelTabs: newTabs, contentPanelActiveTab: newActiveTab };
    }),
  setContentPanelActiveTab: (tab) => set({ contentPanelActiveTab: tab }),

  // Secondary Sidebar
  secondarySidebarTab: 'files',
  setSecondarySidebarTab: (tab) => set({ secondarySidebarTab: tab }),
});
