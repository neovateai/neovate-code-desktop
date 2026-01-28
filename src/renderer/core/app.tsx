import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import type {
  RendererAppOptions,
  WindowConfig,
  RendererPluginHooks,
} from './types';
import { PluginManager } from '../../shared/lib/plugin-manager';
import { useStore } from '../store';
import { hydrateStore, setupPersistence } from '../persistence';
import { ToastProvider } from '../components/ui/toast';
import App from '../App';

function WindowLoadError({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" style={{ padding: 20, textAlign: 'center' }}>
      <h2>Failed to load window</h2>
      <p style={{ color: 'red' }}>{message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export class RendererApp<H extends RendererPluginHooks = RendererPluginHooks> {
  private options: RendererAppOptions<H>;
  private pluginManager: PluginManager<H>;

  constructor(options?: RendererAppOptions<H>) {
    this.options = options ?? {};
    this.pluginManager = new PluginManager(this.options.plugins ?? []);
  }

  async start(container: HTMLElement): Promise<void> {
    await hydrateStore(useStore);
    await this.pluginManager.applySeries('beforeStart', this, {
      args: [{ store: useStore }],
    });

    const windowConfig = this.matchWindow();
    const Content = windowConfig?.render
      ? React.lazy(windowConfig.render)
      : App;

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ErrorBoundary FallbackComponent={WindowLoadError}>
          <ToastProvider position="bottom-right">
            <Suspense fallback={null}>
              <Content />
            </Suspense>
          </ToastProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    );

    setupPersistence(useStore);
  }

  private matchWindow(): WindowConfig | undefined {
    if (!this.options.windows?.length) return undefined;
    const windowId = new URLSearchParams(location.search).get('windowId');
    if (!windowId) return this.options.windows[0];
    return (
      this.options.windows.find((w) => w.windowId === windowId) ??
      this.options.windows[0]
    );
  }
}
