import type { StateCreator } from 'zustand';

// Types
export type ThemeValue = 'light' | 'dark' | 'system';
export type SendMessageWith = 'enter' | 'cmdEnter';

export interface DesktopSettingsSliceState {
  theme: ThemeValue;
  sendMessageWith: SendMessageWith;
  terminalFontSize: number;
  terminalFont: string;
}

export interface DesktopSettingsSliceActions {
  setTheme: (theme: ThemeValue) => void;
  setSendMessageWith: (value: SendMessageWith) => void;
  setTerminalFontSize: (size: number) => void;
  setTerminalFont: (font: string) => void;
}

export type DesktopSettingsSlice = DesktopSettingsSliceState &
  DesktopSettingsSliceActions;

// Default values
export const defaultDesktopSettings: DesktopSettingsSliceState = {
  theme: 'system',
  sendMessageWith: 'enter',
  terminalFontSize: 12,
  terminalFont: '',
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

  setTerminalFontSize: (terminalFontSize: number) => {
    set({ terminalFontSize });
  },

  setTerminalFont: (terminalFont: string) => {
    set({ terminalFont });
  },
});
