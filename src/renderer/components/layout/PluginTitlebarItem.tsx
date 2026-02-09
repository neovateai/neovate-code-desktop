import { Suspense, lazy, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import type { RendererApp } from '../../core/app';
import type { TitlebarItemDescriptor } from '../../core/plugin';

export function PluginTitlebarItem({
  item,
  app,
}: {
  item: TitlebarItemDescriptor;
  app: RendererApp;
}) {
  const LazyComponent = useMemo(
    () => lazy(item.componentLoader),
    [item.componentLoader],
  );

  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => console.error(`[Plugin] ${item.id} failed:`, error)}
    >
      <Suspense fallback={null}>
        <LazyComponent app={app} />
      </Suspense>
    </ErrorBoundary>
  );
}
