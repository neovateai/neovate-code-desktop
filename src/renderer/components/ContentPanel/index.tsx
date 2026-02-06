import { lazy, memo, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { type RendererApp, useRendererApp } from '../../core/app';
import type {
  ContentPanelDescriptor,
  ContentPanelProps as PluginPaneProps,
} from '../../core/plugin';
import { cn } from '../../lib/utils';
import {
  ContentPanelProvider,
  useContentPanelContext,
} from './ContentPanelProvider';
import { ContentTabBar } from './ContentTabBar';
import { PanelError, PanelLoading, PanelNotFound } from './PanelFallbacks';
import { BrowserPane } from './panes/BrowserPane';
import { EditorPane } from './panes/EditorPane';
import { ReviewPane } from './panes/ReviewPane';
import { TerminalPane } from './panes/TerminalPane';
import type { ContentTab, PluginTab } from './types';

// Empty state when no tabs
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <p>No tabs open</p>
    </div>
  );
}

// Routes to correct pane based on activeTab.type
function ContentPaneRouter() {
  const { tabs, activeTabId } = useContentPanelContext();

  if (tabs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
      {tabs.map((tab) => (
        <ContentPane key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  );
}

// Inner component that renders plugin content (hooks called unconditionally)
const PluginPaneContent = memo(function PluginPaneContent({
  tab,
  isActive,
  app,
  descriptor,
}: {
  tab: PluginTab;
  isActive: boolean;
  app: RendererApp;
  descriptor: ContentPanelDescriptor;
}) {
  const Component = useMemo(
    () => lazy(descriptor.componentLoader),
    [descriptor.componentLoader],
  );

  return (
    <div className={cn('h-full', !isActive && 'hidden')}>
      <ErrorBoundary FallbackComponent={PanelError}>
        <Suspense fallback={<PanelLoading />}>
          <Component tab={tab} app={app} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

// Plugin pane renderer (validates before rendering)
const ContentPanelPluginPane = memo(function ContentPanelPluginPane({
  tab,
  isActive,
}: {
  tab: PluginTab;
  isActive: boolean;
}) {
  const app = useRendererApp();
  const descriptor = useMemo(
    () =>
      app.contributions
        .flatMap((c) => c.contentPanels ?? [])
        .find((p) => p.id === tab.panelId),
    [app.contributions, tab.panelId],
  );

  if (!descriptor) {
    return <PanelNotFound panelId={tab.panelId} />;
  }

  return (
    <PluginPaneContent
      tab={tab}
      isActive={isActive}
      app={app}
      descriptor={descriptor}
    />
  );
});

// Individual pane renderer
const ContentPane = memo(function ContentPane({
  tab,
  isActive,
}: {
  tab: ContentTab;
  isActive: boolean;
}) {
  switch (tab.type) {
    case 'terminal':
      return <TerminalPane tab={tab} isActive={isActive} />;
    case 'editor':
      return <EditorPane tab={tab} isActive={isActive} />;
    case 'review':
      return <ReviewPane tab={tab} isActive={isActive} />;
    case 'browser':
      return <BrowserPane tab={tab} isActive={isActive} />;
    case 'plugin':
      return <ContentPanelPluginPane tab={tab} isActive={isActive} />;
    default:
      return null;
  }
});

// Main ContentPanel component
interface ContentPanelProps {
  repoPath: string;
  hidden?: boolean;
}

function ContentPanelBase({ repoPath, hidden }: ContentPanelProps) {
  return (
    <ContentPanelProvider repoPath={repoPath}>
      <div
        className={`flex flex-col flex-1 bg-background text-foreground ${hidden ? 'hidden' : 'flex'}`}
      >
        <ContentTabBar />
        <ContentPaneRouter />
      </div>
    </ContentPanelProvider>
  );
}

// Export memoized component
export const ContentPanel = memo(ContentPanelBase);

export { useContentPanelContext } from './ContentPanelProvider';
// Re-export types and hooks for external use
export type { ContentTab, ContentTabType } from './types';
