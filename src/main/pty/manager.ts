import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BrowserWindow } from 'electron';

export interface PTYCreateOptions {
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

export interface PTYInstance {
  pty: IPty;
  cwd: string;
}

/**
 * PTYManager - Singleton managing all PTY instances in the main process
 * Handles creation, I/O, resize, and cleanup of pseudo-terminals
 */
class PTYManager {
  private ptys = new Map<string, PTYInstance>();

  /**
   * Get the default shell for the current platform
   */
  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/zsh';
  }

  /**
   * Validate and resolve cwd, falling back to home directory
   */
  private resolveCwd(cwd?: string): string {
    const homeDir = os.homedir();

    // If no cwd provided or empty string, use home directory
    if (!cwd || cwd.trim() === '') {
      return homeDir;
    }

    // Check if directory exists
    try {
      const stats = fs.statSync(cwd);
      if (stats.isDirectory()) {
        return cwd;
      }
    } catch {
      // Directory doesn't exist or can't be accessed
      console.warn(
        `PTY cwd "${cwd}" doesn't exist, falling back to home directory`,
      );
    }

    return homeDir;
  }

  /**
   * Send data to all renderer windows via IPC
   */
  private sendToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  /**
   * Create a new PTY instance
   * @returns The unique PTY ID
   */
  create(options: PTYCreateOptions = {}): string {
    const ptyId = crypto.randomUUID();
    const shell = options.shell || this.getDefaultShell();
    const cwd = this.resolveCwd(options.cwd);
    const cols = Math.max(options.cols || 80, 1);
    const rows = Math.max(options.rows || 24, 1);

    console.log(
      `Creating PTY: shell=${shell}, cwd=${cwd}, cols=${cols}, rows=${rows}`,
    );

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: process.env as Record<string, string>,
      });

      // Forward PTY output to renderer
      ptyProcess.onData((data) => {
        this.sendToRenderer('terminal:data', { ptyId, data });
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        this.sendToRenderer('terminal:exit', { ptyId, exitCode, signal });
        this.ptys.delete(ptyId);
      });

      this.ptys.set(ptyId, { pty: ptyProcess, cwd });

      return ptyId;
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
      throw new Error(
        `Failed to create terminal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Write data to a PTY
   */
  write(ptyId: string, data: string): void {
    const instance = this.ptys.get(ptyId);
    if (instance) {
      instance.pty.write(data);
    }
  }

  /**
   * Resize a PTY
   */
  resize(ptyId: string, cols: number, rows: number): void {
    const instance = this.ptys.get(ptyId);
    if (instance) {
      instance.pty.resize(cols, rows);
    }
  }

  /**
   * Destroy a PTY instance
   */
  destroy(ptyId: string): void {
    const instance = this.ptys.get(ptyId);
    if (instance) {
      instance.pty.kill();
      this.ptys.delete(ptyId);
    }
  }

  /**
   * Destroy all PTY instances (for cleanup on app quit)
   */
  destroyAll(): void {
    for (const [ptyId] of this.ptys) {
      this.destroy(ptyId);
    }
  }

  /**
   * Get the number of active PTY instances
   */
  get count(): number {
    return this.ptys.size;
  }
}

// Export singleton instance
export const ptyManager = new PTYManager();
