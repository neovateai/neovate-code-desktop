import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  Tray,
} from 'electron';
import { is, platform } from '@electron-toolkit/utils';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerMainHandlers } from '../shared/lib/ipc/main';
import { codeServerManager } from './code-server';
import { ipcMainHandlers } from './ipc';
import { ptyManager } from './pty';
import { neovateServerManager } from './server';
import { updaterService } from './updater';

// declare const _dirname: string;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'Cmd+,',
          click: () => {
            mainWindow?.webContents.send('menu:open-settings');
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            updaterService.manualCheck();
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'Cmd+Option+T',
          click: () => {
            mainWindow?.webContents.send('menu:toggle-theme');
          },
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  const trayIconDir = is.dev
    ? path.join(process.cwd(), 'build/icons/tray')
    : path.join(__dirname, '../../build/icons/tray');

  const updateTrayIcon = () => {
    if (!tray) return;
    const iconFile = nativeTheme.shouldUseDarkColors
      ? 'tray.png'
      : 'tray-dark.png';
    const iconPath = path.join(trayIconDir, iconFile);
    const icon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 });
    tray.setImage(icon);
  };

  // Create initial tray with appropriate icon
  const initialIconFile = nativeTheme.shouldUseDarkColors
    ? 'tray.png'
    : 'tray-dark.png';
  const initialIconPath = path.join(trayIconDir, initialIconFile);
  const icon = nativeImage
    .createFromPath(initialIconPath)
    .resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip(app.name);

  // Listen for theme changes and update tray icon
  nativeTheme.on('updated', updateTrayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      accelerator: 'Cmd+,',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('menu:open-settings');
      },
    },
    {
      label: 'Check for Updates...',
      click: () => {
        updaterService.manualCheck();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'Cmd+Q',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Initialize updater service after window is created
  if (mainWindow) {
    updaterService.init(mainWindow);
  }

  // Load renderer
  if (is.dev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Updates are checked when renderer calls updater.check
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register typesafe IPC handlers
registerMainHandlers(ipcMainHandlers);

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

    // JSON parse error - return null for fresh start
    if (error instanceof SyntaxError) {
      return null;
    }

    // Other errors - return null
    return null;
  }
});

ipcMain.on('app:quit', () => {
  app.quit();
});

// Open external URL in system default browser
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});

app.whenReady().then(() => {
  // Set dev icon in dock when running in development mode (macOS)
  if (is.dev && platform.isMacOS && app.dock) {
    const devIconPath = path.join(process.cwd(), 'build/icons/icon-dev.png');
    app.dock.setIcon(devIconPath);
  }

  createMenu();
  createTray();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!platform.isMacOS) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Register shutdown handler to clean up server, PTYs, tray, and updater on app quit
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  updaterService.destroy();
  ptyManager.destroyAll();
  codeServerManager.stop();
  neovateServerManager.stop();
});
