// Shared types between main and renderer processes

export interface ElectronAPI {
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

// Extend Window interface for type safety
declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
