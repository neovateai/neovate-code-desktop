import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load renderer
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Check for updates in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle directory listing requests with confirmation
  ipcMain.on('request-list-directory', (event) => {
    const PROJECT_DIR =
      '/Users/chencheng/Documents/Code/github.com/neovateai/neovate-code-desktop';
    // Send confirmation request back to renderer
    event.sender.send('confirm-list-directory', { path: PROJECT_DIR });
  });

  ipcMain.on('confirm-response', async (event, { confirmed }) => {
    const PROJECT_DIR =
      '/Users/chencheng/Documents/Code/github.com/neovateai/neovate-code-desktop';
    let result: { success: boolean; files?: string[]; message?: string };

    if (confirmed) {
      try {
        const files = await fs.readdir(PROJECT_DIR);
        result = { success: true, files };
      } catch (error) {
        console.error('Error reading directory:', error);
        result = { success: false, message: (error as Error).message };
      }
    } else {
      result = { success: false, message: 'Directory listing cancelled' };
    }

    // Send result back to renderer
    event.sender.send('directory-result', result);
  });

  // Handle directory selection dialog
  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Repository Directory',
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] || null;
  });
}

// Store persistence IPC handlers
const STORE_DIR = path.join(os.homedir(), '.neovate', 'desktop');
const STORE_FILE = path.join(STORE_DIR, 'store.json');

ipcMain.handle('store:save', async (_event, state) => {
  try {
    // Ensure directory exists
    await fs.mkdir(STORE_DIR, { recursive: true });

    // Write atomically: write to temp file then rename
    const tempFile = `${STORE_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    await fs.rename(tempFile, STORE_FILE);

    return { success: true };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    let message = 'Failed to save store';

    if (err.code === 'EACCES') {
      message = 'Permission denied saving state';
    } else if (err.code === 'ENOSPC') {
      message = 'Insufficient disk space';
    } else if (err.code === 'ENOENT') {
      message = 'Cannot create config directory';
    }

    console.error('Store save error:', err);
    throw new Error(message);
  }
});

ipcMain.handle('store:load', async () => {
  try {
    const data = await fs.readFile(STORE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    // File doesn't exist is not an error - just return null for fresh start
    if (err.code === 'ENOENT') {
      return null;
    }

    // JSON parse error - log and return null for fresh start
    if (error instanceof SyntaxError) {
      console.error('Failed to parse store.json, starting fresh:', error);
      return null;
    }

    // Other errors - log but return null
    console.error('Failed to load store:', error);
    return null;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
