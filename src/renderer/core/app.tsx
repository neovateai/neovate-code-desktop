import { StrictMode, createContext, lazy, Suspense, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nextProvider } from 'react-i18next';
import { ipcMainCaller } from '../lib/ipc';
import { ToastProvider } from '../components/ui/toast';
import { hydrateStore, setupPersistence } from '../persistence';
import { useStore } from '../store';
import { RenderErrorFallback } from './components/RenderErrorFallback';
import type { LazyNamespaceConfig } from './i18n';
import { I18nManager } from './i18n/manager';
import type { PluginConfigContribution } from './plugin';
import { PluginManager } from './plugin-manager';
import type {
  RendererPlugin,
  RendererPluginConfig,
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
  private pluginManager: PluginManager<
    RendererPluginHooks,
    RendererPluginConfig
  >;
  readonly i18nManager: I18nManager;
  readonly useStore: typeof useStore;

  /** Plugin UI contributions collected at startup */
  contributions: PluginConfigContribution[] = [];

  /** UI operations namespace - TODO: add panel APIs after tabManager refactor */
  readonly ui = {};

  /**
   * Window operations namespace for plugins.
   *
   * Sub-window routing:
   * - `windowType` determines which component to render. It matches against
   *   `WindowConfig.windowType` registered in `RendererApp({ windows: [...] })`.
   * - `windowId` is the instance dedup key. Opening the same `windowId` twice
   *   focuses the existing window instead of creating a duplicate. Different
   *   `windowId` values with the same `windowType` open independent windows
   *   that render the same component.
   *
   * Flow: `app.window.open(...)` → IPC → BrowserWindowManager creates
   * BrowserWindow with `?windowId=xxx&windowType=yyy` → renderer loads →
   * `matchWindowBySearchParams()` matches `windowType` to a `WindowConfig` →
   * renders the matched component.
   */
  readonly window = {
    open: ipcMainCaller.window.open,
    close: ipcMainCaller.window.close,
  };

  constructor(options?: RendererAppOptions) {
    this.windows = options?.windows ?? [];
    this.pluginManager = new PluginManager(options?.plugins);
    this.i18nManager = new I18nManager();
    this.useStore = useStore;
  }

  async start(): Promise<void> {
    const windowConfig = this.matchWindowBySearchParams();

    // Collect i18n configs from plugins
    const i18nResults = await this.pluginManager.applyParallel(
      'configI18n',
      {},
    );
    const lazyNamespaceConfigs = i18nResults.filter(
      (r): r is LazyNamespaceConfig => r != null,
    );

    // Hydrate store for both main and sub windows (locale, etc.)
    await hydrateStore(useStore);
    await this.i18nManager.init({ store: useStore });

    // Sub window: render matched component directly
    if (windowConfig) {
      this.i18nManager.setupLazyNamespaces(lazyNamespaceConfigs);
      this.render(lazy(windowConfig.componentLoader));
      return;
    }
    this.i18nManager.setupLazyNamespaces(lazyNamespaceConfigs);

    // Collect plugin UI contributions
    const results = await this.pluginManager.applyParallel(
      'configContributes',
      { app: this },
    );
    this.contributions = results.filter(
      (r): r is PluginConfigContribution => r != null,
    );

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
   * Match window config by windowType query param.
   * Note: Main window (no windowType param) always uses default App component.
   * The windows config is intentionally for sub-windows only.
   */
  private matchWindowBySearchParams(): WindowConfig | undefined {
    if (!this.windows.length) return undefined;
    const windowType = new URLSearchParams(location.search).get('windowType');
    if (!windowType) return undefined;
    return this.windows.find((w) => w.windowType === windowType);
  }
}
