import type { SerializeAddon } from '@xterm/addon-serialize';
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from 'react';
import type { Terminal as XTerm } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { ContentTab } from './types';
import { type UseContentTabsReturn, useContentTabs } from './useContentTabs';

// Terminal runtime instance (not serialized)
export interface TerminalInstance {
  xterm: XTerm;
  fitAddon: FitAddon;
  serializeAddon: SerializeAddon;
  ptyId: string | null;
  cwd: string;
  env: Record<string, string>;
  cleanup?: () => void;
}

// Runtime instance map interface
export interface RuntimeInstanceMap<T> {
  get: (tabId: string) => T | undefined;
  set: (tabId: string, instance: T) => void;
  delete: (tabId: string) => void;
  has: (tabId: string) => boolean;
}

// Context value combines tab manager with runtime instances
export interface ContentPanelContextValue extends UseContentTabsReturn {
  repoPath: string;
  isDark: boolean;
  terminalInstances: RuntimeInstanceMap<TerminalInstance>;
}

const ContentPanelContext = createContext<ContentPanelContextValue | undefined>(
  undefined,
);

export function useContentPanelContext(): ContentPanelContextValue {
  const context = useContext(ContentPanelContext);
  if (!context) {
    throw new Error(
      'useContentPanelContext must be used within ContentPanelProvider',
    );
  }
  return context;
}

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

// Create runtime instance map
function useRuntimeInstances<T>(): RuntimeInstanceMap<T> {
  const instancesRef = useRef(new Map<string, T>());

  return useMemo(
    () => ({
      get: (id: string) => instancesRef.current.get(id),
      set: (id: string, instance: T) => instancesRef.current.set(id, instance),
      delete: (id: string) => instancesRef.current.delete(id),
      has: (id: string) => instancesRef.current.has(id),
    }),
    [],
  );
}

interface ContentPanelProviderProps {
  repoPath: string;
  children: ReactNode;
}

export function ContentPanelProvider({
  repoPath,
  children,
}: ContentPanelProviderProps) {
  const isDark = useIsDarkMode();
  const terminalInstances = useRuntimeInstances<TerminalInstance>();

  // Cleanup terminal instances when tab is closed
  const handleTabClose = (tab: ContentTab) => {
    if (tab.type === 'terminal') {
      const instance = terminalInstances.get(tab.id);
      if (instance) {
        // Call cleanup function (unsubscribe listeners, save state)
        if (instance.cleanup) {
          instance.cleanup();
        }
        if (instance.ptyId) {
          // Import dynamically to avoid circular deps
          import('../../lib/ipc').then(({ ipcMainCaller }) => {
            ipcMainCaller.terminal.destroy({ ptyId: instance.ptyId! });
            // Delete persisted state when tab is explicitly closed
            ipcMainCaller.terminal.deleteState({ repoPath, tabId: tab.id });
          });
        }
        instance.xterm.dispose();
        terminalInstances.delete(tab.id);
      }
    }
  };

  const tabManager = useContentTabs({
    repoPath,
    onTabClose: handleTabClose,
  });

  const contextValue: ContentPanelContextValue = useMemo(
    () => ({
      ...tabManager,
      repoPath,
      isDark,
      terminalInstances,
    }),
    [tabManager, repoPath, isDark, terminalInstances],
  );

  return (
    <ContentPanelContext.Provider value={contextValue}>
      {children}
    </ContentPanelContext.Provider>
  );
}

// Re-export for convenience
import { useEffect, useState } from 'react';
