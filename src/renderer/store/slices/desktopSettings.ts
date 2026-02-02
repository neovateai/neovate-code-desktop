import type { StateCreator } from 'zustand';
import {
  DEFAULT_KEYBINDINGS,
  type KeybindingAction,
} from '../../lib/keybindings';

// Types
export type ThemeValue = 'light' | 'dark' | 'system';
export type SendMessageWith = 'enter' | 'cmdEnter';
export type KeybindingsConfig = Record<KeybindingAction, string>;
export type LanguageValue = 'en-US' | 'zh-CN';

export interface DesktopSettingsSliceState {
  theme: ThemeValue;
  sendMessageWith: SendMessageWith;
  terminalFontSize: number;
  terminalFont: string;
  keybindings: KeybindingsConfig;
  developerMode: boolean;
  runOnStartup: boolean;
  language: LanguageValue;
  multiProjectSupport: boolean;
}

export interface DesktopSettingsSliceActions {
  setTheme: (theme: ThemeValue) => void;
  setSendMessageWith: (value: SendMessageWith) => void;
  setTerminalFontSize: (size: number) => void;
  setTerminalFont: (font: string) => void;
  setKeybinding: (action: KeybindingAction, binding: string) => void;
  resetKeybindings: () => void;
  setDeveloperMode: (enabled: boolean) => void;
  setRunOnStartup: (enabled: boolean) => void;
  setLanguage: (language: LanguageValue) => void;
  setMultiProjectSupport: (enabled: boolean) => void;
}

export type DesktopSettingsSlice = DesktopSettingsSliceState &
  DesktopSettingsSliceActions;

// Default values
export const defaultDesktopSettings: DesktopSettingsSliceState = {
  theme: 'system',
  sendMessageWith: 'enter',
  terminalFontSize: 12,
  terminalFont: '',
  keybindings: { ...DEFAULT_KEYBINDINGS },
  developerMode: false,
  runOnStartup: false,
  language: 'en-US',
  multiProjectSupport: false,
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

  setKeybinding: (action: KeybindingAction, binding: string) => {
    set((state) => ({
      keybindings: {
        ...state.keybindings,
        [action]: binding,
      },
    }));
  },

  resetKeybindings: () => {
    set({ keybindings: { ...DEFAULT_KEYBINDINGS } });
  },

  setDeveloperMode: (developerMode: boolean) => {
    set({ developerMode });
  },

  setRunOnStartup: (runOnStartup: boolean) => {
    set({ runOnStartup });
  },
  setLanguage: (language: LanguageValue) => {
    set({ language });
  },
  setMultiProjectSupport: (multiProjectSupport: boolean) => {
    set({ multiProjectSupport });
  },
});
