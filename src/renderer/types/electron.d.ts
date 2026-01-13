// Shared types between main and renderer processes
import type { ElectronAPI } from '@electron-toolkit/preload';

export interface LegacyElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  requestListDirectory: () => void;
  onConfirmRequest: (callback: (data: { path: string }) => void) => void;
  sendConfirmResponse: (confirmed: boolean) => void;
  onDirectoryResult: (
    callback: (data: {
      success: boolean;
      files?: string[];
      message?: string;
    }) => void,
  ) => void;
  removeConfirmRequestListener: () => void;
  removeDirectoryResultListener: () => void;
  saveStore: (state: any) => Promise<{ success: boolean }>;
  loadStore: () => Promise<any>;
  selectDirectory: () => Promise<string | null>;
  rendererReady: () => void;
  quitApp: () => void;
  // Terminal PTY events
  onTerminalData: (
    callback: (data: { ptyId: string; data: string }) => void,
  ) => () => void;
  onTerminalExit: (
    callback: (data: {
      ptyId: string;
      exitCode: number;
      signal?: number;
    }) => void,
  ) => () => void;
}

// Extend Window interface for type safety
declare global {
  interface Window {
    electron: ElectronAPI & LegacyElectronAPI;
  }
}
