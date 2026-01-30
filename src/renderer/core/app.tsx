import { createContext, lazy, StrictMode, Suspense, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nextProvider } from 'react-i18next';
import { ToastProvider } from '../components/ui/toast';
import { hydrateStore, setupPersistence } from '../persistence';
import { useStore } from '../store';
import { RenderErrorFallback } from './components/RenderErrorFallback';
import { I18nManager } from './i18n/manager';
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
  readonly i18nManager: I18nManager;

  constructor(options?: RendererAppOptions) {
    this.windows = options?.windows ?? [];
    this.pluginManager = new PluginManager(options?.plugins);
    this.i18nManager = new I18nManager();
  }

  async start(): Promise<void> {
    const windowConfig = this.matchWindowBySearchParams();

    // Collect i18n configs from plugins (App collects, I18nManager consumes)
    const lazyNamespaceConfigs = (
      this.pluginManager.getPlugins() as readonly RendererPlugin[]
    ).flatMap((plugin) => (plugin.i18n ? [plugin.i18n] : []));

    // Sub window: render matched component directly
    if (windowConfig) {
      await this.i18nManager.init();
      this.i18nManager.setupLazyNamespaces(lazyNamespaceConfigs);
      this.render(lazy(windowConfig.componentLoader));
      return;
    }

    // Main window: hydrate store first, then init everything else
    await hydrateStore(useStore);
    await this.i18nManager.init({ store: useStore });
    this.i18nManager.setupLazyNamespaces(lazyNamespaceConfigs);

    await this.pluginManager.applySeries(
      'beforeRender',
      { app: this },
      { store: useStore },
    );
    this.render(lazy(() => import('../App')));
    setupPersistence(useStore);
  }

  render(Component: React.ComponentType): void {
    const container = document.getElementById('root')!;

    ReactDOM.createRoot(container).render(
      <StrictMode>
        <ErrorBoundary FallbackComponent={RenderErrorFallback}>
          <RendererAppContext.Provider value={this}>
            <I18nextProvider i18n={this.i18nManager.getInstance}>
              <ToastProvider position="bottom-right">
                <Suspense fallback={null}>
                  <Component />
                </Suspense>
              </ToastProvider>
            </I18nextProvider>
          </RendererAppContext.Provider>
        </ErrorBoundary>
      </StrictMode>,
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
