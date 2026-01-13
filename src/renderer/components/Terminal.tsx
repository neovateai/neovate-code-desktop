import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { ipcMainCaller } from '../lib/ipc';

// Terminal tab state
interface TerminalTab {
  id: string;
  name: string;
  ptyId: string | null;
  xterm: XTerm | null;
  fitAddon: FitAddon | null;
}

// Define the context type
interface TerminalContextType {
  activeTabId: string;
  tabs: TerminalTab[];
  setActiveTab: (tabId: string) => void;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  cwd: string;
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
function createXTermInstance(): { xterm: XTerm; fitAddon: FitAddon } {
  const xterm = new XTerm({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    theme: {
      background: '#0d0d0d',
      foreground: '#e0e0e0',
      cursor: '#f0f0f0',
      cursorAccent: '#0d0d0d',
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
    },
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

// Main component
export const Terminal = ({ cwd }: { cwd: string }) => {
  console.log('[Terminal] Component render, cwd prop:', cwd);
  // Create initial tab with stable ID
  const [{ tabs, activeTabId }, setTerminalState] = useState(() => {
    const initialTab = createTerminalTab('Terminal 1');
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
    [tabs, activeTabId],
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
  };

  return (
    <TerminalContext.Provider value={contextValue}>
      <div
        className="flex flex-col flex-1"
        style={{
          backgroundColor: '#0d0d0d',
          color: 'var(--text-primary)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <Terminal.Tabs />
        <Terminal.XTermView />
      </div>
    </TerminalContext.Provider>
  );
};

// Tabs component
Terminal.Tabs = function Tabs() {
  const { activeTabId, tabs, setActiveTab, addTab, closeTab } =
    useTerminalContext();

  return (
    <div
      className="flex items-center"
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#161616',
      }}
    >
      {tabs.map((tab) => (
        <Terminal.Tab
          key={tab.id}
          id={tab.id}
          isActive={activeTabId === tab.id}
          onClose={tabs.length > 1 ? () => closeTab(tab.id) : undefined}
        >
          {tab.name}
        </Terminal.Tab>
      ))}
      <button
        className="px-3 py-2 hover:bg-white/5 transition-colors"
        style={{ color: '#666' }}
        onClick={addTab}
        title="New Terminal"
      >
        +
      </button>
    </div>
  );
};

// Tab component
Terminal.Tab = function Tab({
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
      className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-white/5 transition-colors"
      style={
        isActive
          ? {
              borderBottom: '2px solid #27c93f',
              color: '#e0e0e0',
              marginBottom: '-1px',
            }
          : { color: '#666' }
      }
      onClick={() => setActiveTab(id)}
    >
      <span>{children}</span>
      {onClose && (
        <button
          className="hover:bg-white/10 rounded p-0.5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close Terminal"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Single terminal pane - each tab gets its own instance
function TerminalPane({
  tab,
  isActive,
  cwd,
}: {
  tab: TerminalTab;
  isActive: boolean;
  cwd: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  console.log('[TerminalPane] render', { tabId: tab.id, isActive, cwd });

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      console.log('[Terminal] Skipping - not active or no container', {
        tabId: tab.id,
        isActive,
      });
      return;
    }

    if (initializedRef.current && tab.xterm) {
      console.log('[Terminal] Already initialized, just focusing', tab.id);
      tab.fitAddon?.fit();
      tab.xterm.focus();
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let mountTimeout: ReturnType<typeof setTimeout> | null = null;

    console.log('[Terminal] Initializing terminal', {
      tabId: tab.id,
      isActive,
    });

    const initialize = async () => {
      if (disposed) return;

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.log(
          '[Terminal] Container has no dimensions, retrying...',
          tab.id,
        );
        mountTimeout = setTimeout(initialize, 50);
        return;
      }

      try {
        const { xterm, fitAddon } = createXTermInstance();
        tab.xterm = xterm;
        tab.fitAddon = fitAddon;

        console.log('[Terminal] Opening xterm', {
          tabId: tab.id,
          width: container.clientWidth,
          height: container.clientHeight,
        });
        xterm.open(container);
        fitAddon.fit();
        xterm.focus();
        console.log('[Terminal] xterm opened and focused', tab.id);

        console.log('[Terminal] Setting up input handler', tab.id);
        xterm.onData((data) => {
          console.log('[Terminal] Input received', {
            tabId: tab.id,
            ptyId: tab.ptyId,
            dataLen: data.length,
          });
          if (tab.ptyId) {
            ipcMainCaller.terminal.write({ ptyId: tab.ptyId, data });
          } else {
            console.warn('[Terminal] No ptyId, cannot send input', tab.id);
          }
        });

        if (!tab.ptyId) {
          console.log('[Terminal] Creating PTY', {
            tabId: tab.id,
            cols: xterm.cols,
            rows: xterm.rows,
            cwd,
          });
          const { ptyId } = await ipcMainCaller.terminal.create({
            cwd: cwd || undefined,
            cols: xterm.cols || 80,
            rows: xterm.rows || 24,
          });

          if (disposed) {
            console.log(
              '[Terminal] Disposed during PTY creation, destroying PTY',
              tab.id,
            );
            ipcMainCaller.terminal.destroy({ ptyId });
            return;
          }

          tab.ptyId = ptyId;
          console.log('[Terminal] PTY created and assigned', {
            ptyId,
            tabId: tab.id,
          });

          if (xterm.cols > 0 && xterm.rows > 0) {
            await ipcMainCaller.terminal.resize({
              ptyId,
              cols: xterm.cols,
              rows: xterm.rows,
            });
          }
        }

        initializedRef.current = true;
        console.log('[Terminal] Fully initialized', tab.id);
      } catch (error) {
        console.error('[Terminal] Initialization failed:', error);
        tab.xterm?.writeln('\r\n\x1b[31mFailed to start terminal.\x1b[0m');
      }
    };

    requestAnimationFrame(() => {
      if (!disposed) initialize();
    });

    return () => {
      console.log('[Terminal] Effect cleanup', tab.id);
      disposed = true;
      if (mountTimeout) clearTimeout(mountTimeout);
      if (tab.xterm && !initializedRef.current) {
        tab.xterm.dispose();
        tab.xterm = null;
        tab.fitAddon = null;
      }
    };
  }, [isActive, tab, cwd]);

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
      className="flex-1 p-2"
      style={{
        minHeight: 0,
        backgroundColor: '#0d0d0d',
        display: isActive ? 'block' : 'none',
      }}
      onClick={() => tab.xterm?.focus()}
    />
  );
}

// XTerm view component - renders all terminal panes
Terminal.XTermView = function XTermView() {
  const { activeTabId, tabs, cwd } = useTerminalContext();
  console.log('[Terminal.XTermView] render, cwd from context:', cwd);

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
        />
      ))}
    </div>
  );
};
