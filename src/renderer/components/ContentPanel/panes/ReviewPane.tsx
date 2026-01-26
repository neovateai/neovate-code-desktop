import type { ReviewTab } from '../types';

interface ReviewPaneProps {
  tab: ReviewTab;
  isActive: boolean;
}

export function ReviewPane({ tab, isActive }: ReviewPaneProps) {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{
        display: isActive ? 'flex' : 'none',
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div className="text-center">
        <p className="text-lg">Review</p>
        <p className="text-sm opacity-60 mt-1">{tab.name}</p>
      </div>
    </div>
  );
}
