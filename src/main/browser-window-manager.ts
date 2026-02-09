import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import { BrowserWindow } from 'electron';

export interface WindowOpenOptions {
  windowId: string;
  windowType: string;
  width?: number;
  height?: number;
  title?: string;
  parent?: boolean;
}

class BrowserWindowManager {
  private windows = new Map<string, BrowserWindow>();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(win: BrowserWindow | null): void {
    this.mainWindow = win;
  }

  open(options: WindowOpenOptions): void {
    const {
      windowId,
      windowType,
      width = 800,
      height = 600,
      title,
      parent = false,
    } = options;

    const existing = this.windows.get(windowId);
    if (existing) {
      if (!existing.isDestroyed()) {
        existing.focus();
        return;
      }
      this.windows.delete(windowId);
    }

    const win = new BrowserWindow({
      width,
      height,
      title: title ?? windowId,
      ...(parent && this.mainWindow ? { parent: this.mainWindow } : {}),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    const params = new URLSearchParams({ windowId, windowType });
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      const url = new URL(process.env.ELECTRON_RENDERER_URL);
      url.search = params.toString();
      win.loadURL(url.toString());
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'), {
        search: params.toString(),
      });
    }

    win.on('closed', () => {
      this.windows.delete(windowId);
    });

    win.webContents.on('did-fail-load', () => {
      this.windows.delete(windowId);
      if (!win.isDestroyed()) win.close();
    });

    this.windows.set(windowId, win);
  }

  close(windowId: string): void {
    const win = this.windows.get(windowId);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }

  destroyAll(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
    this.windows.clear();
  }
}

export const browserWindowManager = new BrowserWindowManager();
