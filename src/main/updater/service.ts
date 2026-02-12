import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdaterOptions } from '../core/types';
import {
  exposeAsMainHandlers,
  getRendererCaller,
} from '../../shared/lib/ipc/main';
import type { UpdaterState } from '../../shared/types/updater';
import type { IPCRendererHandlers } from '../ipc';

class UpdaterService {
  static CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  private mainWindow: BrowserWindow | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastDownloadedVersion: string | null = null;
  private isManualDownload = false;
  private isChecking = false;
  private isAutoUpdaterSetup = false;
  private pendingUpdate: {
    version: string;
    status: 'available' | 'downloading' | 'ready';
    percent: number;
  } | null = null;

  async init(
    mainWindow: BrowserWindow,
    updaterOptions?: UpdaterOptions,
  ): Promise<void> {
    this.mainWindow = mainWindow;

    if (!this.isAutoUpdaterSetup) {
      if (updaterOptions?.channel) {
        autoUpdater.channel = updaterOptions.channel;
      }

      if (updaterOptions?.feedURL) {
        try {
          const resolved =
            typeof updaterOptions.feedURL === 'function'
              ? await updaterOptions.feedURL()
              : updaterOptions.feedURL;
          autoUpdater.setFeedURL(resolved);
        } catch (err) {
          console.error(
            '[UpdaterService] Failed to resolve feedURL, using build-time config:',
            (err as Error).message,
          );
        }
      }

      this.setupAutoUpdater();
      this.isAutoUpdaterSetup = true;
    }

    this.startScheduledChecks();
  }

  private setupAutoUpdater(): void {
    autoUpdater.autoDownload = false;

    autoUpdater.on('download-progress', (progress) => {
      console.log(
        '[UpdaterService] Download progress:',
        progress.percent.toFixed(1) + '%',
      );
      if (this.pendingUpdate) {
        this.pendingUpdate.percent = progress.percent;
        if (this.isManualDownload) {
          this.send(
            'downloadProgress',
            this.pendingUpdate.version,
            progress.percent,
          );
        }
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[UpdaterService] Update downloaded:', info.version);
      this.lastDownloadedVersion = info.version;
      if (this.pendingUpdate) {
        this.pendingUpdate.status = 'ready';
        this.pendingUpdate.percent = 100;
        this.send('updateReady', info.version);
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('[UpdaterService] Error:', err.message);
      this.pendingUpdate = null;
      if (this.isManualDownload) {
        this.send('error', err.message);
      }
      this.isManualDownload = false;
    });
  }

  private startScheduledChecks(): void {
    if (this.checkInterval) return;
    this.autoCheck();
    this.checkInterval = setInterval(
      () => this.autoCheck(),
      UpdaterService.CHECK_INTERVAL_MS,
    );
  }

  /** Auto check: silent download, only show toast when ready */
  private async autoCheck(): Promise<void> {
    if (this.pendingUpdate || this.isChecking) return;

    this.isChecking = true;
    this.isManualDownload = false;

    try {
      console.log('[UpdaterService] Auto check...');
      const result = await autoUpdater.checkForUpdates();
      if (!result?.updateInfo) return;

      const version = result.updateInfo.version;

      if (this.lastDownloadedVersion === version) {
        // Already downloaded, show ready state
        this.pendingUpdate = {
          version,
          status: 'ready',
          percent: 100,
        };
        this.send('updateReady', version);
        return;
      }

      if (result.isUpdateAvailable) {
        // Start silent download
        this.pendingUpdate = {
          version,
          status: 'downloading',
          percent: 0,
        };
        autoUpdater.downloadUpdate();
      }
    } catch (err) {
      console.error(
        '[UpdaterService] Auto check failed:',
        (err as Error).message,
      );
    } finally {
      this.isChecking = false;
    }
  }

  private send<K extends keyof IPCRendererHandlers['updater']>(
    event: K,
    ...args: Parameters<IPCRendererHandlers['updater'][K]>
  ) {
    if (this.mainWindow) {
      const caller = getRendererCaller<IPCRendererHandlers>(
        this.mainWindow.webContents,
      );
      (caller.updater[event].send as (...a: unknown[]) => void)(...args);
    }
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    autoUpdater.removeAllListeners();
    this.isAutoUpdaterSetup = false;
    this.pendingUpdate = null;
    this.lastDownloadedVersion = null;
    this.isManualDownload = false;
    this.isChecking = false;
    this.mainWindow = null;
  }

  /** Manual check from menu - shows UI feedback */
  manualCheck() {
    if (!this.mainWindow) return;
    this.check();
  }

  // IPC handlers
  mainHandlers = exposeAsMainHandlers(this, [
    'getState',
    'check',
    'dismiss',
    'download',
    'install',
  ]);

  getState(): UpdaterState {
    if (!this.pendingUpdate) return { status: 'idle' };

    // Hide silent download from UI
    if (!this.isManualDownload && this.pendingUpdate.status === 'downloading') {
      return { status: 'idle' };
    }

    const { version, status, percent } = this.pendingUpdate;
    if (status === 'downloading') {
      return { status: 'downloading', version, percent };
    }
    if (status === 'available') {
      return { status: 'available', version };
    }
    return { status: 'ready', version };
  }

  async check() {
    // If already have a pending update, just re-send its state
    if (this.pendingUpdate) {
      const { version, status, percent } = this.pendingUpdate;
      if (status === 'available') {
        this.send('updateAvailable', version);
      } else if (status === 'ready') {
        this.send('updateReady', version);
      } else if (status === 'downloading') {
        // User manually checked during silent download - show them the progress
        this.isManualDownload = true;
        this.send('downloadProgress', version, percent);
      }
      return;
    }

    // Prevent race condition with autoCheck
    if (this.isChecking) return;

    this.isChecking = true;
    this.isManualDownload = true;
    this.send('checking');

    try {
      console.log('[UpdaterService] Manual check...');
      const result = await autoUpdater.checkForUpdates();
      if (!result?.updateInfo) {
        this.send('upToDate');
        return;
      }

      const version = result.updateInfo.version;

      // Check if already downloaded
      if (this.lastDownloadedVersion === version) {
        this.pendingUpdate = {
          version,
          status: 'ready',
          percent: 100,
        };
        this.send('updateReady', version);
        return;
      }

      if (result.isUpdateAvailable) {
        this.pendingUpdate = {
          version,
          status: 'available',
          percent: 0,
        };
        this.send('updateAvailable', version);
      } else {
        this.send('upToDate');
      }
    } catch (err) {
      console.error(
        '[UpdaterService] Manual check failed:',
        (err as Error).message,
      );
      this.send('error', (err as Error).message);
    } finally {
      this.isChecking = false;
    }
  }

  dismiss() {
    // Keep lastDownloadedVersion so we can show "Restart" if user checks again
    if (
      this.pendingUpdate?.status === 'available' ||
      this.pendingUpdate?.status === 'ready'
    ) {
      this.pendingUpdate = null;
    }
  }

  download() {
    if (!this.pendingUpdate || this.pendingUpdate.status !== 'available')
      return;
    this.pendingUpdate.status = 'downloading';
    this.pendingUpdate.percent = 0;
    this.isManualDownload = true;
    autoUpdater.downloadUpdate();
  }

  install() {
    autoUpdater.quitAndInstall();
  }
}

export const updaterService = new UpdaterService();
