import React, { Suspense, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { ToastProvider } from '../components/ui/toast';
import { hydrateStore, setupPersistence } from '../persistence';
import { useStore } from '../store';
import { RenderErrorFallback } from './components/RenderErrorFallback';
import { PluginManager } from './plugin-manager';
import type {
  RendererPlugin,
  RendererPluginHooks,
  WindowConfig,
} from './types';

const RendererAppContext = createContext<RendererApp | null>(null);

export function useRendererApp(): RendererApp {
  const app = useContext(RendererAppContext);
  if (!app) {
    throw new Error('useRendererApp must be used within RendererApp');
  }
  return app;
}

/**
 * Options for RendererApp
 */
export interface RendererAppOptions {
  plugins?: RendererPlugin[];
  windows?: WindowConfig[];
}

export class RendererApp {
  private windows: WindowConfig[];
  private pluginManager: PluginManager<RendererPluginHooks>;

  constructor(options?: RendererAppOptions) {
    this.windows = options?.windows ?? [];
    this.pluginManager = new PluginManager(options?.plugins);
  }

  async start(): Promise<void> {
    const windowConfig = this.matchWindowBySearchParams();

    // Sub window: render matched component directly
    if (windowConfig) {
      this.render(React.lazy(windowConfig.componentLoader));
      return;
    }

    // Main window: hydrate store, run plugins, render app, setup persistence
    await hydrateStore(useStore);
    await this.pluginManager.applySeries(
      'beforeRender',
      { app: this },
      {
        store: useStore,
      },
    );
    this.render(React.lazy(() => import('../App')));
    setupPersistence(useStore);
  }

  render(Component: React.ComponentType): void {
    const container = document.getElementById('root')!;

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ErrorBoundary FallbackComponent={RenderErrorFallback}>
          <RendererAppContext.Provider value={this}>
            <ToastProvider position="bottom-right">
              <Suspense fallback={null}>
                <Component />
              </Suspense>
            </ToastProvider>
          </RendererAppContext.Provider>
        </ErrorBoundary>
      </React.StrictMode>,
    );
  }

  /**
   * Match window config by windowId query param.
   * Note: Main window (no windowId param) always uses default App component.
   * The windows config is intentionally for sub-windows only.
   */
  private matchWindowBySearchParams(): WindowConfig | undefined {
    if (!this.windows.length) return undefined;
    const windowId = new URLSearchParams(location.search).get('windowId');
    if (!windowId) return undefined;
    return this.windows.find((w) => w.windowId === windowId);
  }
}
