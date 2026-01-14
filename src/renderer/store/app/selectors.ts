import type { AppStore } from './store';

// Primary Sidebar (used in multiple components)
export const selectPrimarySidebarCollapsed = (s: AppStore) =>
  s.primarySidebarCollapsed;

// Secondary Sidebar (used in multiple components)
export const selectSecondarySidebarCollapsed = (s: AppStore) =>
  s.secondarySidebarCollapsed;
export const selectSecondarySidebarTab = (s: AppStore) => s.secondarySidebarTab;
export const selectSetSecondarySidebarCollapsed = (s: AppStore) =>
  s.setSecondarySidebarCollapsed;

// Terminal Panel
export const selectTerminalPanelCollapsed = (s: AppStore) =>
  s.terminalPanelCollapsed;
