// Shared types between main and renderer processes

export interface ElectronAPI {
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
}

// Extend Window interface for type safety
declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
