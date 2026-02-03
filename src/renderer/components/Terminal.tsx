import { type ITheme, Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type React from 'react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ipcMainCaller } from '../lib/ipc';
import { cn } from '../lib/utils';
import { useStore } from '../store';

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

// Hook to detect dark mode from document.documentElement
function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Terminal tab state
interface TerminalTab {
  id: string;
  name: string;
  ptyId: string | null;
  xterm: XTerm | null;
  fitAddon: FitAddon | null;
}

// Terminal context type
interface TerminalContextType {
  activeTabId: string;
  tabs: TerminalTab[];
  setActiveTab: (tabId: string) => void;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  cwd: string;
  isDark: boolean;
  terminalFontSize: number;
  terminalFont: string;
}

// Create the context
const TerminalContext = createContext<TerminalContextType | undefined>(
  undefined,
);

// Custom hook to use the context
export function useTerminalContext() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within Terminal');
  }
  return context;
}

// Create a new xterm instance with configuration
function createXTermInstance(
  isDark: boolean,
  fontSize: number,
  fontFamily: string,
): {
  xterm: XTerm;
  fitAddon: FitAddon;
} {
  const defaultFontFamily =
    'JetBrains Mono, Menlo, Monaco, "Courier New", monospace';
  const xterm = new XTerm({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: fontFamily || defaultFontFamily,
    fontSize,
    lineHeight: 1.2,
    theme: isDark ? darkTerminalTheme : lightTerminalTheme,
  });

  const fitAddon = new FitAddon();
  xterm.loadAddon(fitAddon);

  return { xterm, fitAddon };
}

// Generate unique tab ID using crypto for uniqueness across HMR
function generateTabId(): string {
  return `terminal-${crypto.randomUUID().slice(0, 8)}`;
}

// Create a new terminal tab (xterm created lazily in TerminalPane)
function createTerminalTab(name: string): TerminalTab {
  return {
    id: generateTabId(),
    name,
    ptyId: null,
    xterm: null,
    fitAddon: null,
  };
}

// Terminal icon component
function TerminalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M5 7l2 2-2 2" />
      <path d="M9 11h2" />
    </svg>
  );
}

// Tab component - pill-style design with 3 states: default, hover, active
function TerminalTabItem({
  id,
  children,
  isActive,
  onClose,
}: {
  id: string;
  children: React.ReactNode;
  isActive?: boolean;
  onClose?: () => void;
}) {
  const { setActiveTab } = useTerminalContext();

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md cursor-pointer transition-colors border border-transparent',
        isActive
          ? 'text-foreground bg-muted border-border'
          : 'text-muted-foreground hover:bg-accent',
      )}
      onClick={() => setActiveTab(id)}
    >
      <TerminalIcon size={14} />
      <span>{children}</span>
      {onClose && (
        <button
          className="flex items-center justify-center w-4 h-4 rounded transition-colors ml-0.5 opacity-60 hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close Terminal"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Tabs component - pill-style tab bar
function TerminalTabs() {
  const { activeTabId, tabs, addTab, closeTab } = useTerminalContext();

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border">
      {tabs.map((tab) => (
        <TerminalTabItem
          key={tab.id}
          id={tab.id}
          isActive={activeTabId === tab.id}
          onClose={tabs.length > 1 ? () => closeTab(tab.id) : undefined}
        >
          {tab.name}
        </TerminalTabItem>
      ))}
      <button
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors text-muted-foreground bg-muted"
        onClick={addTab}
        title="New Terminal"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M7 2v10M2 7h10" />
        </svg>
      </button>
    </div>
  );
}

// Single terminal pane - each tab gets its own instance
function TerminalPane({
  tab,
  isActive,
  cwd,
  isDark,
}: {
  tab: TerminalTab;
  isActive: boolean;
  cwd: string;
  isDark: boolean;
}) {
  const { terminalFontSize, terminalFont } = useTerminalContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Update XTerm theme when dark mode changes
  useEffect(() => {
    if (tab.xterm && initializedRef.current) {
      tab.xterm.options.theme = isDark ? darkTerminalTheme : lightTerminalTheme;
    }
  }, [isDark, tab.xterm]);

  // Update XTerm font settings when they change
  useEffect(() => {
    if (tab.xterm && initializedRef.current) {
      const defaultFontFamily =
        'JetBrains Mono, Menlo, Monaco, "Courier New", monospace';
      tab.xterm.options.fontSize = terminalFontSize;
      tab.xterm.options.fontFamily = terminalFont || defaultFontFamily;
      tab.fitAddon?.fit();
    }
  }, [terminalFontSize, terminalFont, tab.xterm, tab.fitAddon]);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    if (initializedRef.current && tab.xterm) {
      tab.fitAddon?.fit();
      tab.xterm.focus();
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let mountTimeout: ReturnType<typeof setTimeout> | null = null;

    const initialize = async () => {
      if (disposed) return;

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        mountTimeout = setTimeout(initialize, 50);
        return;
      }

      try {
        const { xterm, fitAddon } = createXTermInstance(
          isDark,
          terminalFontSize,
          terminalFont,
        );
        tab.xterm = xterm;
        tab.fitAddon = fitAddon;

        xterm.open(container);
        fitAddon.fit();
        xterm.focus();

        // Handle keyboard shortcuts (Cmd+K on Mac, Ctrl+K on Windows/Linux to clear)
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
          const modifierKey = isMac ? event.metaKey : event.ctrlKey;
          if (event.type === 'keydown' && modifierKey && event.key === 'k') {
            xterm.clear();
            return false; // Prevent default handling
          }
          return true; // Let xterm handle other keys
        });

        xterm.onData((data: string) => {
          if (tab.ptyId) {
            ipcMainCaller.terminal.write({ ptyId: tab.ptyId, data });
          }
        });

        if (!tab.ptyId) {
          const { ptyId } = await ipcMainCaller.terminal.create({
            cwd: cwd || undefined,
            cols: xterm.cols || 80,
            rows: xterm.rows || 24,
          });

          if (disposed) {
            ipcMainCaller.terminal.destroy({ ptyId });
            return;
          }

          tab.ptyId = ptyId;

          if (xterm.cols > 0 && xterm.rows > 0) {
            await ipcMainCaller.terminal.resize({
              ptyId,
              cols: xterm.cols,
              rows: xterm.rows,
            });
          }
        }

        initializedRef.current = true;
      } catch (error) {
        console.error('[Terminal] Initialization failed:', error);
        tab.xterm?.writeln('\r\n\x1b[31mFailed to start terminal.\x1b[0m');
      }
    };

    requestAnimationFrame(() => {
      if (!disposed) initialize();
    });

    return () => {
      disposed = true;
      if (mountTimeout) clearTimeout(mountTimeout);
      if (tab.xterm && !initializedRef.current) {
        tab.xterm.dispose();
        tab.xterm = null;
        tab.fitAddon = null;
      }
    };
  }, [isActive, tab, cwd, isDark]);

  useEffect(() => {
    if (!containerRef.current || !tab.xterm || !tab.fitAddon) return;

    const container = containerRef.current;
    const { xterm, fitAddon } = tab;

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
          if (tab.ptyId && xterm.cols > 0 && xterm.rows > 0) {
            ipcMainCaller.terminal.resize({
              ptyId: tab.ptyId,
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
  }, [tab, tab.xterm, tab.fitAddon]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 p-2 min-h-0 bg-background',
        isActive ? 'block' : 'hidden',
      )}
      onClick={() => tab.xterm?.focus()}
    />
  );
}

// XTerm view component - renders all terminal panes
function TerminalXTermView() {
  const { activeTabId, tabs, cwd, isDark } = useTerminalContext();

  // Listen for PTY data from main process
  useEffect(() => {
    const unsubscribeData = window.electron.onTerminalData(
      ({ ptyId, data }) => {
        const tab = tabs.find((t) => t.ptyId === ptyId);
        if (tab?.xterm) {
          tab.xterm.write(data);
        }
      },
    );

    const unsubscribeExit = window.electron.onTerminalExit(
      ({ ptyId, exitCode }) => {
        const tab = tabs.find((t) => t.ptyId === ptyId);
        if (tab?.xterm) {
          tab.xterm.writeln(`\r\n[Process exited with code ${exitCode}]`);
          tab.ptyId = null;
        }
      },
    );

    return () => {
      unsubscribeData();
      unsubscribeExit();
    };
  }, [tabs]);

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
      {tabs.map((tab) => (
        <TerminalPane
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          cwd={cwd}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

// Main component (internal)
function TerminalBase({ cwd, hidden }: { cwd: string; hidden?: boolean }) {
  const isDark = useIsDarkMode();
  const terminalFontSize = useStore((state) => state.terminalFontSize);
  const terminalFont = useStore((state) => state.terminalFont);

  // Create initial tab with stable ID
  const [{ tabs, activeTabId }, setTerminalState] = useState(() => {
    const initialTab = createTerminalTab('Terminal');
    return {
      tabs: [initialTab],
      activeTabId: initialTab.id,
    };
  });

  const setTabs = useCallback(
    (updater: TerminalTab[] | ((prev: TerminalTab[]) => TerminalTab[])) => {
      setTerminalState((state) => ({
        ...state,
        tabs: typeof updater === 'function' ? updater(state.tabs) : updater,
      }));
    },
    [],
  );

  const setActiveTabId = useCallback((id: string) => {
    setTerminalState((state) => ({ ...state, activeTabId: id }));
  }, []);

  const addTab = useCallback(() => {
    setTerminalState((state) => {
      const newTab = createTerminalTab(`Terminal ${state.tabs.length + 1}`);
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
    });
  }, []);

  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        if (tab.ptyId) {
          await ipcMainCaller.terminal.destroy({ ptyId: tab.ptyId });
        }
        tab.xterm?.dispose();
      }

      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId && newTabs.length > 0) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
        }
        return newTabs;
      });
    },
    [tabs, activeTabId, setTabs, setActiveTabId],
  );

  useEffect(() => {
    return () => {
      for (const tab of tabs) {
        if (tab.ptyId) {
          ipcMainCaller.terminal.destroy({ ptyId: tab.ptyId });
        }
        tab.xterm?.dispose();
      }
    };
  }, []);

  const contextValue: TerminalContextType = {
    activeTabId,
    tabs,
    setActiveTab: setActiveTabId,
    addTab,
    closeTab,
    cwd,
    isDark,
    terminalFontSize,
    terminalFont,
  };

  return (
    <TerminalContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex flex-col flex-1 bg-background text-foreground',
          hidden ? 'hidden' : 'flex',
        )}
      >
        <TerminalTabs />
        <TerminalXTermView />
      </div>
    </TerminalContext.Provider>
  );
}

// Export memoized Terminal with compound components
export const Terminal = Object.assign(memo(TerminalBase), {
  Tabs: TerminalTabs,
  Tab: TerminalTabItem,
  XTermView: TerminalXTermView,
});
