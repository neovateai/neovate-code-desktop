import { SerializeAddon } from '@xterm/addon-serialize';
import { useCallback, useEffect, useRef } from 'react';
import { type ITheme, Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  TERMINAL_MAX_SCROLLBACK_LINES,
  TERMINAL_SAVE_COOLDOWN_MS,
  TERMINAL_SAVE_DEBOUNCE_MS,
} from '../../../constants';
import { ipcMainCaller } from '../../../lib/ipc';
import { logger } from '../../../lib/logger';
import {
  type TerminalInstance,
  useContentPanelContext,
} from '../ContentPanelProvider';
import type { TerminalTab } from '../types';

// XTerm theme configurations
const darkTerminalTheme: ITheme = {
  background: '#0a0a0a',
  foreground: '#e0e0e0',
  cursor: '#f0f0f0',
  cursorAccent: '#0a0a0a',
  selectionBackground: 'rgba(255, 255, 255, 0.2)',
  black: '#1d1d1d',
  red: '#ff5f56',
  green: '#27c93f',
  yellow: '#ffbd2e',
  blue: '#57acf5',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#abb2bf',
  brightBlack: '#5c6370',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
};

const lightTerminalTheme: ITheme = {
  background: '#fafafa',
  foreground: '#383a42',
  cursor: '#526eff',
  cursorAccent: '#fafafa',
  selectionBackground: 'rgba(0, 0, 0, 0.1)',
  black: '#383a42',
  red: '#e45649',
  green: '#50a14f',
  yellow: '#c18401',
  blue: '#4078f2',
  magenta: '#a626a4',
  cyan: '#0184bc',
  white: '#a0a1a7',
  brightBlack: '#4f525e',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
};

// Create a new xterm instance with configuration
function createXTermInstance(isDark: boolean): {
  xterm: XTerm;
  fitAddon: FitAddon;
  serializeAddon: SerializeAddon;
} {
  const xterm = new XTerm({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    scrollback: TERMINAL_MAX_SCROLLBACK_LINES,
    theme: isDark ? darkTerminalTheme : lightTerminalTheme,
  });

  const fitAddon = new FitAddon();
  const serializeAddon = new SerializeAddon();
  xterm.loadAddon(fitAddon);
  xterm.loadAddon(serializeAddon);

  return { xterm, fitAddon, serializeAddon };
}

/**
 * Strip trailing empty prompts from serialized terminal buffer.
 * Detects prompt lines (starting with ❯, $, %, >) that have no command after them
 * and removes them along with any preceding prompt context lines.
 */
function stripTrailingEmptyPrompt(buffer: string): string {
  const lines = buffer.split('\r\n');
  if (lines.length === 0) return buffer;

  // Common prompt indicators (after stripping ANSI codes)
  const promptIndicators = ['❯', '$', '%', '>'];

  // Regex to strip ANSI escape sequences for detection
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

  // Find the last line that has actual command content (not just a prompt)
  let lastContentLineIndex = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const cleanLine = stripAnsi(line).trim();

    // Skip empty lines
    if (cleanLine === '') continue;

    // Check if this line starts with a prompt indicator
    const startsWithPrompt = promptIndicators.some((p) =>
      cleanLine.startsWith(p),
    );

    if (startsWithPrompt) {
      // Extract text after prompt indicator
      const promptChar = promptIndicators.find((p) => cleanLine.startsWith(p));
      const afterPrompt = cleanLine.slice(promptChar?.length || 1).trim();

      // If there's actual command text after the prompt, this is a command line
      // Ignore common zsh markers like '%' which indicate end of partial line
      if (afterPrompt && afterPrompt !== '%' && !/^%\s*$/.test(afterPrompt)) {
        lastContentLineIndex = i;
        break;
      }
      // Otherwise it's an empty prompt, continue searching backwards
    } else {
      // Not a prompt line - could be output or multi-line prompt context
      // Check if it looks like prompt context (path info, git status, etc.)
      // These typically contain path separators or special prompt chars
      const looksLikePromptContext =
        cleanLine.includes('via ') || // starship/powerlevel10k
        cleanLine.includes(' on ') || // git branch indicators
        /^[~/]/.test(cleanLine) || // starts with path
        /^\[.*\]$/.test(cleanLine); // bracketed info like [master]

      if (!looksLikePromptContext) {
        // This is actual command output
        lastContentLineIndex = i;
        break;
      }
      // Otherwise continue searching backwards past prompt context
    }
  }

  // If we found content, include one more line (empty line after output) if present
  if (lastContentLineIndex >= 0) {
    let endIndex = lastContentLineIndex + 1;
    // Include trailing empty line if present (for cleaner formatting)
    if (endIndex < lines.length && lines[endIndex].trim() === '') {
      endIndex++;
    }
    return lines.slice(0, endIndex).join('\r\n');
  }

  // No content found - return empty or minimal buffer
  return '';
}

interface TerminalPaneProps {
  tab: TerminalTab;
  isActive: boolean;
}

export function TerminalPane({ tab, isActive }: TerminalPaneProps) {
  const { repoPath, isDark, terminalInstances, updateTab } =
    useContentPanelContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAllowedRef = useRef(false); // Flag to prevent saving during initial PTY output

  // Save terminal state (debounced)
  const saveTerminalState = useCallback(
    async (instance: TerminalInstance, force = false) => {
      if (!instance.ptyId) return;

      // Skip saving during cooldown period (unless forced)
      if (!force && !saveAllowedRef.current) {
        logger.debug(
          '[ContentPanel:TerminalPane] Skipping save during cooldown for tabId:',
          tab.id,
        );
        return;
      }

      try {
        // Get current cwd from PTY
        const { cwd } = await ipcMainCaller.terminal.getCwd({
          ptyId: instance.ptyId,
        });

        // Serialize terminal buffer
        const rawBuffer = instance.serializeAddon.serialize({
          scrollback: TERMINAL_MAX_SCROLLBACK_LINES,
        });

        // Strip trailing empty prompts to avoid duplicate prompts on restore
        const serializedBuffer = stripTrailingEmptyPrompt(rawBuffer);

        // Skip saving if buffer is empty (only had empty prompts)
        if (!serializedBuffer) {
          logger.debug(
            '[ContentPanel:TerminalPane] Skipping save - buffer empty after stripping prompts',
          );
          return;
        }

        logger.debug(
          '[ContentPanel:TerminalPane] Serialized buffer length:',
          serializedBuffer.length,
          '(raw:',
          rawBuffer.length,
          ') first 200 chars:',
          serializedBuffer.slice(0, 200),
        );

        // Save to disk
        await ipcMainCaller.terminal.saveState({
          tabId: tab.id,
          repoPath,
          serializedBuffer,
          cwd: cwd || instance.cwd,
          env: instance.env,
          scrollbackLines: TERMINAL_MAX_SCROLLBACK_LINES,
        });

        logger.debug(
          '[ContentPanel:TerminalPane] State saved for tabId:',
          tab.id,
        );
      } catch (error) {
        logger.error(
          '[ContentPanel:TerminalPane] Failed to save state:',
          error,
        );
      }
    },
    [tab.id, repoPath],
  );

  // Debounced save trigger
  const scheduleSave = useCallback(
    (instance: TerminalInstance) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveTerminalState(instance);
      }, TERMINAL_SAVE_DEBOUNCE_MS);
    },
    [saveTerminalState],
  );

  // Update XTerm theme when dark mode changes
  useEffect(() => {
    const instance = terminalInstances.get(tab.id);
    if (instance?.xterm && initializedRef.current) {
      instance.xterm.options.theme = isDark
        ? darkTerminalTheme
        : lightTerminalTheme;
    }
  }, [isDark, tab.id, terminalInstances]);

  // Initialize terminal
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    // If already initialized, just fit and focus
    if (initializedRef.current && terminalInstances.has(tab.id)) {
      const instance = terminalInstances.get(tab.id);
      instance?.fitAddon.fit();
      instance?.xterm.focus();
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let dimensionObserver: ResizeObserver | null = null;

    const initialize = async () => {
      if (disposed) return;

      // Wait for container to have dimensions via ResizeObserver
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        dimensionObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (
            entry &&
            entry.contentRect.width > 0 &&
            entry.contentRect.height > 0
          ) {
            dimensionObserver?.disconnect();
            dimensionObserver = null;
            if (!disposed) {
              initialize();
            }
          }
        });
        dimensionObserver.observe(container);
        return;
      }

      try {
        const { xterm, fitAddon, serializeAddon } = createXTermInstance(isDark);

        xterm.open(container);
        fitAddon.fit();

        // Select-to-copy: copy selection to clipboard on mouseup
        const handleMouseUp = () => {
          if (xterm.hasSelection()) {
            const selectedText = xterm.getSelection();
            if (selectedText) {
              navigator.clipboard.writeText(selectedText).catch((err) => {
                logger.error(
                  '[ContentPanel:TerminalPane] Failed to copy to clipboard:',
                  err,
                );
              });
            }
          }
        };
        container.addEventListener('mouseup', handleMouseUp);

        // Try to restore previous state
        const { state: savedState } = await ipcMainCaller.terminal.loadState({
          repoPath,
          tabId: tab.id,
        });

        logger.debug(
          '[ContentPanel:TerminalPane] Load state result - tabId:',
          tab.id,
          'hasState:',
          !!savedState,
          'bufferLength:',
          savedState?.serializedBuffer?.length,
        );

        if (savedState) {
          logger.debug(
            '[ContentPanel:TerminalPane] Restoring saved state for tabId:',
            tab.id,
            'first 200 chars:',
            savedState.serializedBuffer.slice(0, 200),
          );
          // Write saved buffer to terminal
          xterm.write(savedState.serializedBuffer);
        }

        xterm.focus();

        // Handle keyboard shortcuts (Cmd+K on Mac, Ctrl+K on Windows/Linux to clear)
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        xterm.attachCustomKeyEventHandler((event) => {
          const modifierKey = isMac ? event.metaKey : event.ctrlKey;
          if (event.type === 'keydown' && modifierKey && event.key === 'k') {
            xterm.clear();
            return false;
          }
          return true;
        });

        // Determine cwd - use saved state or repo path
        const initialCwd = savedState?.cwd || repoPath || undefined;
        const initialEnv = savedState?.env || {};

        // Create PTY
        logger.debug(
          '[ContentPanel:TerminalPane] Creating PTY with cwd:',
          initialCwd,
        );
        const { ptyId } = await ipcMainCaller.terminal.create({
          cwd: initialCwd,
          cols: xterm.cols || 80,
          rows: xterm.rows || 24,
        });
        logger.debug('[ContentPanel:TerminalPane] PTY created with id:', ptyId);

        if (disposed) {
          logger.debug(
            '[ContentPanel:TerminalPane] Disposed during PTY creation, cleaning up',
          );
          ipcMainCaller.terminal.destroy({ ptyId });
          xterm.dispose();
          return;
        }

        // Store instance
        const instance: TerminalInstance = {
          xterm,
          fitAddon,
          serializeAddon,
          ptyId,
          cwd: initialCwd || repoPath,
          env: initialEnv,
        };
        terminalInstances.set(tab.id, instance);
        logger.debug(
          '[ContentPanel:TerminalPane] Instance stored in map for tabId:',
          tab.id,
        );

        // Update tab with ptyId
        updateTab(tab.id, { ptyId });

        // Wire up data handling (user input -> PTY)
        xterm.onData((data) => {
          if (instance.ptyId) {
            ipcMainCaller.terminal.write({ ptyId: instance.ptyId, data });
          }
        });

        // Wire up PTY output -> XTerm (must be done here, not in separate effect)
        logger.debug(
          '[ContentPanel:TerminalPane] Setting up PTY data listeners for ptyId:',
          ptyId,
        );
        const unsubscribeData = window.electron.onTerminalData(
          ({ ptyId: incomingPtyId, data }) => {
            if (incomingPtyId === instance.ptyId && instance.xterm) {
              instance.xterm.write(data);
              // Schedule save on data received
              scheduleSave(instance);
            }
          },
        );

        const unsubscribeExit = window.electron.onTerminalExit(
          ({ ptyId: exitingPtyId, exitCode }) => {
            if (exitingPtyId === instance.ptyId && instance.xterm) {
              logger.debug(
                '[ContentPanel:TerminalPane] PTY exited:',
                exitingPtyId,
                'code:',
                exitCode,
              );
              instance.xterm.writeln(
                `\r\n[Process exited with code ${exitCode}]`,
              );
              instance.ptyId = null;
              updateTab(tab.id, { ptyId: null });
            }
          },
        );

        // Store unsubscribe functions for cleanup
        instance.cleanup = () => {
          logger.debug(
            '[ContentPanel:TerminalPane] Cleaning up PTY listeners for ptyId:',
            ptyId,
          );
          unsubscribeData();
          unsubscribeExit();
          container.removeEventListener('mouseup', handleMouseUp);
          // Save state before cleanup (force save even during cooldown)
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTerminalState(instance, true);
        };

        // Resize PTY
        if (xterm.cols > 0 && xterm.rows > 0) {
          await ipcMainCaller.terminal.resize({
            ptyId,
            cols: xterm.cols,
            rows: xterm.rows,
          });
        }

        initializedRef.current = true;

        // Set up ResizeObserver for panel resize handling
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        const resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            if (container.clientWidth > 0 && container.clientHeight > 0) {
              fitAddon.fit();
              if (instance.ptyId && xterm.cols > 0 && xterm.rows > 0) {
                ipcMainCaller.terminal.resize({
                  ptyId: instance.ptyId,
                  cols: xterm.cols,
                  rows: xterm.rows,
                });
              }
            }
          }, 50);
        });
        resizeObserver.observe(container);

        // Store cleanup for ResizeObserver
        const originalCleanup = instance.cleanup;
        instance.cleanup = () => {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeObserver.disconnect();
          originalCleanup?.();
        };

        // Start cooldown timer - don't save until after initial PTY output
        saveAllowedRef.current = false;
        setTimeout(() => {
          saveAllowedRef.current = true;
          logger.debug(
            '[ContentPanel:TerminalPane] Save cooldown ended for tabId:',
            tab.id,
          );
        }, TERMINAL_SAVE_COOLDOWN_MS);

        logger.debug('[ContentPanel:TerminalPane] Initialization complete');
      } catch (error) {
        logger.error(
          '[ContentPanel:TerminalPane] Initialization failed:',
          error,
        );
      }
    };

    requestAnimationFrame(() => {
      if (!disposed) initialize();
    });

    return () => {
      disposed = true;
      if (dimensionObserver) dimensionObserver.disconnect();
    };
  }, [
    isActive,
    tab.id,
    repoPath,
    isDark,
    terminalInstances,
    updateTab,
    scheduleSave,
    saveTerminalState,
  ]);

  // Save state on tab switch (when becoming inactive)
  useEffect(() => {
    if (!isActive && initializedRef.current) {
      const instance = terminalInstances.get(tab.id);
      if (instance) {
        // Immediate save when switching away
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTerminalState(instance);
      }
    }
  }, [isActive, tab.id, terminalInstances, saveTerminalState]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex-1 p-2 min-h-0 bg-background ${isActive ? 'block' : 'hidden'}`}
      onClick={() => terminalInstances.get(tab.id)?.xterm.focus()}
    />
  );
}
