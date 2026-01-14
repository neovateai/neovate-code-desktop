import type { StateCreator } from 'zustand';

export interface UISlice {
  // Primary Sidebar (left - tasks/repos)
  primarySidebarCollapsed: boolean;

  // Secondary Sidebar (right - files/git)
  secondarySidebarCollapsed: boolean;
  secondarySidebarSize: number;
  secondarySidebarTab: 'files' | 'git';

  // Terminal Panel
  terminalPanelCollapsed: boolean;

  // Actions
  togglePrimarySidebar: () => void;
  setPrimarySidebarCollapsed: (collapsed: boolean) => void;

  toggleSecondarySidebar: () => void;
  setSecondarySidebarCollapsed: (collapsed: boolean) => void;
  setSecondarySidebarSize: (size: number) => void;
  setSecondarySidebarTab: (tab: 'files' | 'git') => void;

  toggleTerminalPanel: () => void;
  setTerminalPanelCollapsed: (collapsed: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  // Primary Sidebar (left)
  primarySidebarCollapsed: false,

  // Secondary Sidebar (right)
  secondarySidebarCollapsed: true,
  secondarySidebarSize: 300,
  secondarySidebarTab: 'files',

  // Terminal Panel
  terminalPanelCollapsed: false,

  // Primary Sidebar actions
  togglePrimarySidebar: () =>
    set((s) => ({ primarySidebarCollapsed: !s.primarySidebarCollapsed })),
  setPrimarySidebarCollapsed: (collapsed) =>
    set({ primarySidebarCollapsed: collapsed }),

  // Secondary Sidebar actions
  toggleSecondarySidebar: () =>
    set((s) => ({ secondarySidebarCollapsed: !s.secondarySidebarCollapsed })),
  setSecondarySidebarCollapsed: (collapsed) =>
    set({ secondarySidebarCollapsed: collapsed }),
  setSecondarySidebarSize: (size) => set({ secondarySidebarSize: size }),
  setSecondarySidebarTab: (tab) => set({ secondarySidebarTab: tab }),

  // Terminal Panel actions
  toggleTerminalPanel: () =>
    set((s) => ({ terminalPanelCollapsed: !s.terminalPanelCollapsed })),
  setTerminalPanelCollapsed: (collapsed) =>
    set({ terminalPanelCollapsed: collapsed }),
});
