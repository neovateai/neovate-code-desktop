import { memo } from 'react';
import {
  ContentPanelProvider,
  useContentPanelContext,
} from './ContentPanelProvider';
import { ContentTabBar } from './ContentTabBar';
import { TerminalPane } from './panes/TerminalPane';
import { EditorPane } from './panes/EditorPane';
import { ReviewPane } from './panes/ReviewPane';
import { BrowserPane } from './panes/BrowserPane';
import type { ContentTab } from './types';

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

// Individual pane renderer
function ContentPane({
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
    default:
      return null;
  }
}

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

// Re-export types and hooks for external use
export type { ContentTab, ContentTabType } from './types';
export { useContentPanelContext } from './ContentPanelProvider';
