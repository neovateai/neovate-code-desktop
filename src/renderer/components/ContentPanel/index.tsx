import { memo } from 'react';
import {
  ContentPanelProvider,
  useContentPanelContext,
} from './ContentPanelProvider';
import { ContentTabBar } from './ContentTabBar';
import { TerminalPane } from './panes/TerminalPane';
import type { ContentTab } from './types';

// Empty state when no tabs
function EmptyState() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ color: 'var(--text-secondary)' }}
    >
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
      // Future: return <EditorPane tab={tab} isActive={isActive} />;
      return (
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            display: isActive ? 'flex' : 'none',
            color: 'var(--text-secondary)',
          }}
        >
          Editor coming soon
        </div>
      );
    case 'review':
      // Future: return <ReviewPane tab={tab} isActive={isActive} />;
      return (
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            display: isActive ? 'flex' : 'none',
            color: 'var(--text-secondary)',
          }}
        >
          Review coming soon
        </div>
      );
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
        className="flex flex-col flex-1"
        style={{
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
          display: hidden ? 'none' : 'flex',
        }}
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
