import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Terminal state persistence module.
 * Handles saving and loading terminal state to/from disk.
 */

export interface PersistedTerminalState {
  tabId: string;
  repoPath: string;
  serializedBuffer: string;
  cwd: string;
  env: Record<string, string>;
  savedAt: number;
  scrollbackLines: number;
}

// Get the base directory for terminal state storage
function getTerminalStateDir(): string {
  return path.join(app.getPath('userData'), 'terminal-state');
}

// Hash repo path to create a safe directory name
function hashRepoPath(repoPath: string): string {
  return crypto.createHash('md5').update(repoPath).digest('hex').slice(0, 12);
}

// Get the directory for a specific repo's terminal states
function getRepoStateDir(repoPath: string): string {
  return path.join(getTerminalStateDir(), hashRepoPath(repoPath));
}

// Get the file path for a specific terminal tab's state
function getStateFilePath(repoPath: string, tabId: string): string {
  return path.join(getRepoStateDir(repoPath), `${tabId}.json`);
}

/**
 * Save terminal state to disk.
 */
export async function saveTerminalState(
  state: PersistedTerminalState,
): Promise<void> {
  const filePath = getStateFilePath(state.repoPath, state.tabId);
  const dir = path.dirname(filePath);

  try {
    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    // Write state to file
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(state, null, 2),
      'utf-8',
    );
  } catch (error) {
    console.error('[terminal-state] Failed to save state:', error);
    throw error;
  }
}

/**
 * Load terminal state from disk.
 * Returns null if no state exists or state is corrupted.
 */
export async function loadTerminalState(
  repoPath: string,
  tabId: string,
): Promise<PersistedTerminalState | null> {
  const filePath = getStateFilePath(repoPath, tabId);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const state = JSON.parse(content) as PersistedTerminalState;

    // Basic validation
    if (!state.tabId || !state.repoPath || !state.serializedBuffer) {
      console.warn('[terminal-state] Invalid state file, ignoring:', filePath);
      return null;
    }

    return state;
  } catch (error) {
    // File doesn't exist or is corrupted
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[terminal-state] Failed to load state:', error);
    }
    return null;
  }
}

/**
 * Delete terminal state from disk.
 */
export async function deleteTerminalState(
  repoPath: string,
  tabId: string,
): Promise<void> {
  const filePath = getStateFilePath(repoPath, tabId);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[terminal-state] Failed to delete state:', error);
    }
  }
}

/**
 * Get the current working directory of a PTY process.
 * Uses lsof on macOS/Linux to query the process's cwd.
 */
export async function getPtyCwd(pid: number): Promise<string | null> {
  if (process.platform === 'win32') {
    // Windows: not easily supported, return null
    return null;
  }

  try {
    // On macOS/Linux, read /proc/{pid}/cwd symlink or use lsof
    if (process.platform === 'linux') {
      const cwdPath = `/proc/${pid}/cwd`;
      const cwd = await fs.promises.readlink(cwdPath);
      return cwd;
    } else if (process.platform === 'darwin') {
      // macOS: use lsof to get cwd
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        `lsof -p ${pid} | grep cwd | awk '{print $9}'`,
      );
      const cwd = stdout.trim();
      return cwd || null;
    }
  } catch (error) {
    console.warn('[terminal-state] Failed to get PTY cwd:', error);
  }

  return null;
}

/**
 * Prune orphaned state files that don't have corresponding tabs.
 * Called on app startup.
 */
export async function pruneOrphanedStates(
  activeTabIds: Map<string, string[]>, // repoPath -> tabId[]
): Promise<void> {
  const baseDir = getTerminalStateDir();

  try {
    // Check if base directory exists
    await fs.promises.access(baseDir);
  } catch {
    // No terminal state directory yet
    return;
  }

  try {
    const repoDirs = await fs.promises.readdir(baseDir);

    for (const repoHash of repoDirs) {
      const repoDir = path.join(baseDir, repoHash);
      const stat = await fs.promises.stat(repoDir);

      if (!stat.isDirectory()) continue;

      const stateFiles = await fs.promises.readdir(repoDir);

      for (const file of stateFiles) {
        if (!file.endsWith('.json')) continue;

        const tabId = file.replace('.json', '');
        const filePath = path.join(repoDir, file);

        // Check if this tab still exists in any repo's active tabs
        let isActive = false;
        for (const tabIds of activeTabIds.values()) {
          if (tabIds.includes(tabId)) {
            isActive = true;
            break;
          }
        }

        if (!isActive) {
          // Check file age - delete if older than 30 days
          const fileStat = await fs.promises.stat(filePath);
          const ageInDays =
            (Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24);

          if (ageInDays > 30) {
            await fs.promises.unlink(filePath);
            console.log('[terminal-state] Pruned old state file:', filePath);
          }
        }
      }
    }
  } catch (error) {
    console.error('[terminal-state] Failed to prune orphaned states:', error);
  }
}
