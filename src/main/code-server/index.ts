import { execSync } from 'node:child_process';
import { bridgeServer, BRIDGE_SERVER_PORT } from './bridge';
import { CODE_SERVER_PORT, DATA_DIR, EXTENSIONS_DIR } from './constants';
import {
  downloadCodeServer,
  isCodeServerInstalled,
  type ProgressCallback,
} from './download';
import { installExtension } from './installer';
import { overrideCodeServerSettings } from './settings';
import { codeServerStarter } from './starter';
import { injectStyle } from './injector';

export class CodeServerStartError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(`Server start failed: ${message}`);
    this.name = 'CodeServerStartError';
  }
}

export interface CodeServerInstance {
  url: string;
  stop: () => void;
}

/**
 * Kill any process running on the specified port and wait for it to be freed
 */
async function killProcessOnPort(port: number): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Windows
      const result = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf-8',
      });
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !Number.isNaN(Number(pid))) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          } catch {
            // Process may have already exited
          }
        }
      }
    } else {
      // macOS / Linux
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: 'ignore',
      });
    }

    // Wait for port to be fully released (max 2 seconds)
    const maxWaitMs = 2000;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        execSync(`lsof -ti:${port}`, { stdio: 'ignore' });
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Port is free
        return;
      }
    }
  } catch {
    // No process on port, or kill failed - that's fine
  }
}

/**
 * Singleton manager for code-server instance
 */
class CodeServerManager {
  private instance: CodeServerInstance | null = null;
  private startPromise: Promise<CodeServerInstance> | null = null;

  /**
   * Start or get existing code-server instance
   */
  async start(onProgress?: ProgressCallback): Promise<CodeServerInstance> {
    // Return existing instance
    if (this.instance) {
      return this.instance;
    }

    // Wait for in-progress start
    if (this.startPromise) {
      return this.startPromise;
    }

    // Start new instance
    this.startPromise = this.doStart(onProgress)
      .then((instance) => {
        this.instance = instance;
        this.startPromise = null;
        return instance;
      })
      .catch((error) => {
        this.startPromise = null;
        throw error;
      });

    return this.startPromise;
  }

  private async doStart(
    onProgress?: ProgressCallback,
  ): Promise<CodeServerInstance> {
    // 1. Download if not installed
    const installed = await isCodeServerInstalled();
    if (!installed) {
      await downloadCodeServer(onProgress);
    }

    // 2. Override settings for minimal UI
    await overrideCodeServerSettings();

    // 3. Kill any existing process on the ports
    await killProcessOnPort(CODE_SERVER_PORT);
    await killProcessOnPort(BRIDGE_SERVER_PORT);

    // 4a. Start bridge server (REQUIRED for editor functionality)
    try {
      await bridgeServer.start();
    } catch (e) {
      throw new CodeServerStartError(
        `Bridge server failed to start: ${e instanceof Error ? e.message : String(e)}`,
        e instanceof Error ? e : new Error(String(e)),
      );
    }

    // 4b. Install extensions (non-critical, can fail gracefully)
    try {
      await installExtension();
    } catch (e) {
      console.warn(
        '[CodeServerManager] Extension installation failed (non-critical):',
        e,
      );
    }

    // 4c. Inject styles (non-critical, can fail gracefully)
    try {
      injectStyle();
    } catch (e) {
      console.warn(
        '[CodeServerManager] Style injection failed (non-critical):',
        e,
      );
    }

    try {
      await codeServerStarter({
        port: CODE_SERVER_PORT,
        extDir: EXTENSIONS_DIR,
        dataDir: DATA_DIR,
      });

      const url = `http://127.0.0.1:${CODE_SERVER_PORT}`;
      return {
        url,
        stop: () => {
          killProcessOnPort(CODE_SERVER_PORT);
        },
      };
    } catch (error) {
      throw new CodeServerStartError((error as Error).message, error as Error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): { isRunning: boolean; url: string | null } {
    return {
      isRunning: this.instance !== null,
      url: this.instance?.url ?? null,
    };
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.instance) {
      this.instance.stop();
      this.instance = null;
    }
    this.startPromise = null;
  }
}

/**
 * Singleton instance
 */
export const codeServerManager = new CodeServerManager();

// Re-export types
export type { DownloadProgress, ProgressCallback } from './download';
