import type { StateCreator } from 'zustand';

// Types
export type ThemeValue = 'light' | 'dark' | 'system';
export type SendMessageWith = 'enter' | 'cmdEnter';

export interface DesktopSettingsSliceState {
  theme: ThemeValue;
  sendMessageWith: SendMessageWith;
}

export interface DesktopSettingsSliceActions {
  setTheme: (theme: ThemeValue) => void;
  setSendMessageWith: (value: SendMessageWith) => void;
}

export type DesktopSettingsSlice = DesktopSettingsSliceState &
  DesktopSettingsSliceActions;

// Default values
export const defaultDesktopSettings: DesktopSettingsSliceState = {
  theme: 'system',
  sendMessageWith: 'enter',
};

export const createDesktopSettingsSlice: StateCreator<
  DesktopSettingsSlice,
  [],
  [],
  DesktopSettingsSlice
> = (set) => ({
  // Initial state
  ...defaultDesktopSettings,

  // Actions
  setTheme: (theme: ThemeValue) => {
    set({ theme });
  },

  setSendMessageWith: (sendMessageWith: SendMessageWith) => {
    set({ sendMessageWith });
  },
});
