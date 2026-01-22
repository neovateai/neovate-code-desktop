import { useRef, useEffect, useCallback } from 'react';
import { Terminal as XTerm, type ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SerializeAddon } from '@xterm/addon-serialize';
import 'xterm/css/xterm.css';
import { ipcMainCaller } from '../../../lib/ipc';
import { logger } from '../../../lib/logger';
import {
  TERMINAL_SAVE_DEBOUNCE_MS,
  TERMINAL_SAVE_COOLDOWN_MS,
  TERMINAL_MAX_SCROLLBACK_LINES,
} from '../../../constants';
import {
  useContentPanelContext,
  type TerminalInstance,
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
        const serializedBuffer = instance.serializeAddon.serialize({
          scrollback: TERMINAL_MAX_SCROLLBACK_LINES,
        });

        logger.debug(
          '[ContentPanel:TerminalPane] Serialized buffer length:',
          serializedBuffer.length,
          'first 200 chars:',
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
    logger.debug(
      '[ContentPanel:TerminalPane] Init effect - isActive:',
      isActive,
      'tabId:',
      tab.id,
      'hasContainer:',
      !!containerRef.current,
    );

    if (!isActive || !containerRef.current) {
      return;
    }

    // If already initialized, just fit and focus
    if (initializedRef.current && terminalInstances.has(tab.id)) {
      logger.debug(
        '[ContentPanel:TerminalPane] Already initialized, fitting and focusing',
      );
      const instance = terminalInstances.get(tab.id);
      instance?.fitAddon.fit();
      instance?.xterm.focus();
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let mountTimeout: ReturnType<typeof setTimeout> | null = null;

    const initialize = async () => {
      if (disposed) return;

      // Wait for container to have dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        logger.debug(
          '[ContentPanel:TerminalPane] Container has no dimensions, waiting...',
        );
        mountTimeout = setTimeout(initialize, 50);
        return;
      }

      logger.debug(
        '[ContentPanel:TerminalPane] Container dimensions:',
        container.clientWidth,
        'x',
        container.clientHeight,
      );

      try {
        const { xterm, fitAddon, serializeAddon } = createXTermInstance(isDark);
        logger.debug('[ContentPanel:TerminalPane] XTerm instance created');

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
      if (mountTimeout) clearTimeout(mountTimeout);
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

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const instance = terminalInstances.get(tab.id);
    if (!instance?.xterm || !instance?.fitAddon) return;

    const container = containerRef.current;
    const { xterm, fitAddon } = instance;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (
          initializedRef.current &&
          container.clientWidth > 0 &&
          container.clientHeight > 0
        ) {
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

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [tab.id, terminalInstances]);

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
      className="flex-1 p-2"
      style={{
        minHeight: 0,
        backgroundColor: 'var(--bg-base)',
        display: isActive ? 'block' : 'none',
      }}
      onClick={() => terminalInstances.get(tab.id)?.xterm.focus()}
    />
  );
}
