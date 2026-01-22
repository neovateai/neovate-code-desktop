import { useRef, useEffect } from 'react';
import { Terminal as XTerm, type ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { ipcMainCaller } from '../../../lib/ipc';
import { logger } from '../../../lib/logger';
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
} {
  const xterm = new XTerm({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    theme: isDark ? darkTerminalTheme : lightTerminalTheme,
  });

  const fitAddon = new FitAddon();
  xterm.loadAddon(fitAddon);

  return { xterm, fitAddon };
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
        const { xterm, fitAddon } = createXTermInstance(isDark);
        logger.debug('[ContentPanel:TerminalPane] XTerm instance created');

        xterm.open(container);
        fitAddon.fit();
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

        // Create PTY
        logger.debug(
          '[ContentPanel:TerminalPane] Creating PTY with cwd:',
          repoPath,
        );
        const { ptyId } = await ipcMainCaller.terminal.create({
          cwd: repoPath || undefined,
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
        const instance: TerminalInstance = { xterm, fitAddon, ptyId };
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
        (instance as TerminalInstance & { cleanup?: () => void }).cleanup =
          () => {
            logger.debug(
              '[ContentPanel:TerminalPane] Cleaning up PTY listeners for ptyId:',
              ptyId,
            );
            unsubscribeData();
            unsubscribeExit();
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
  }, [isActive, tab.id, repoPath, isDark, terminalInstances, updateTab]);

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
