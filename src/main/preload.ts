import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

const compatibleElectronAPI = {
  // Legacy APIs (keep for backward compatibility with non-migrated code)
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  requestListDirectory: () => ipcRenderer.send('request-list-directory'),
  onConfirmRequest: (callback: (data: { path: string }) => void) =>
    ipcRenderer.on('confirm-list-directory', (_event, data) => callback(data)),
  sendConfirmResponse: (confirmed: boolean) =>
    ipcRenderer.send('confirm-response', { confirmed }),
  onDirectoryResult: (
    callback: (data: {
      success: boolean;
      files?: string[];
      message?: string;
    }) => void,
  ) => ipcRenderer.on('directory-result', (_event, data) => callback(data)),
  removeConfirmRequestListener: () =>
    ipcRenderer.removeAllListeners('confirm-list-directory'),
  removeDirectoryResultListener: () =>
    ipcRenderer.removeAllListeners('directory-result'),
  // Store persistence
  saveStore: (state: any) => ipcRenderer.invoke('store:save', state),
  loadStore: () => ipcRenderer.invoke('store:load'),
  // Directory selection
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('select-directory'),
  rendererReady: () => ipcRenderer.send('renderer:ready'),

  quitApp: () => ipcRenderer.send('app:quit'),

  // Expose @electron-toolkit/preload API for typesafe IPC
  ...electronAPI,
};

/**
 * Expose Electron APIs from your preload script, the API
 * will be accessible from the website on `window.electron`.
 */
export function exposeElectronAPI(): void {
  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('electron', compatibleElectronAPI);
    } catch (error) {
      console.error(error);
    }
  } else {
    // @ts-expect-error (need dts)
    window.electron = electronAPI;
  }
}

// Call the function to expose the API
exposeElectronAPI();
