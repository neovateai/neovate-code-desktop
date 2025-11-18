import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
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
});
