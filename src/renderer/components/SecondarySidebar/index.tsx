import { lazy, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useRendererApp } from '../../core/app';
import type { SecondarySidebarPanelDescriptor } from '../../core/plugin';
import { useStore } from '../../store';
import {
  PanelError,
  PanelLoading,
  PanelNotFound,
} from '../ContentPanel/PanelFallbacks';
import { FileTree } from './FileTree';
import { GitPanel } from './GitPanel';
import { SearchPanel } from './SearchPanel';

// Inner component (hooks called unconditionally)
function PluginPaneContent({
  app,
  descriptor,
}: {
  app: ReturnType<typeof useRendererApp>;
  descriptor: SecondarySidebarPanelDescriptor;
}) {
  const Component = useMemo(
    () => lazy(descriptor.componentLoader),
    [descriptor.componentLoader],
  );

  return (
    <ErrorBoundary FallbackComponent={PanelError}>
      <Suspense fallback={<PanelLoading />}>
        <Component app={app} />
      </Suspense>
    </ErrorBoundary>
  );
}

function SecondarySidebarPluginPane({ panelId }: { panelId: string }) {
  const app = useRendererApp();
  const descriptor = useMemo(
    () =>
      app.contributions.secondarySidebarPanels?.find((p) => p.id === panelId),
    [app.contributions.secondarySidebarPanels, panelId],
  );

  if (!descriptor) {
    return <PanelNotFound panelId={panelId} />;
  }

  return <PluginPaneContent app={app} descriptor={descriptor} />;
}

export function SecondarySidebar() {
  const app = useRendererApp();
  const secondarySidebarTab = useStore((s) => s.secondarySidebarTab);

  // Determine panel title
  const isBuiltinTab =
    secondarySidebarTab === 'files' ||
    secondarySidebarTab === 'git' ||
    secondarySidebarTab === 'search';
  const panelTitle = useMemo(() => {
    if (secondarySidebarTab === 'files') return 'Files';
    if (secondarySidebarTab === 'git') return 'Git';
    if (secondarySidebarTab === 'search') return 'Search';
    const descriptor = app.contributions.secondarySidebarPanels?.find(
      (p) => p.id === secondarySidebarTab,
    );
    return descriptor?.title ?? 'Unknown';
  }, [secondarySidebarTab, app.contributions.secondarySidebarPanels]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-10 flex items-center px-3 shrink-0 border-b border-border">
        <span className="text-sm font-medium text-foreground">
          {panelTitle}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {secondarySidebarTab === 'files' && <FileTree />}
        {secondarySidebarTab === 'git' && <GitPanel />}
        <SearchPanel active={secondarySidebarTab === 'search'} />
        {!isBuiltinTab && (
          <SecondarySidebarPluginPane panelId={secondarySidebarTab} />
        )}
      </div>
    </div>
  );
}
