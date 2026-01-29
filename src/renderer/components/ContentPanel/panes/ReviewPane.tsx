import type { ReviewTab } from '../types';

interface ReviewPaneProps {
  tab: ReviewTab;
  isActive: boolean;
}

export function ReviewPane({ tab, isActive }: ReviewPaneProps) {
  return (
    <div
      className={`flex-1 items-center justify-center text-muted-foreground bg-background ${isActive ? 'flex' : 'hidden'}`}
    >
      <div className="text-center">
        <p className="text-lg">Review</p>
        <p className="text-sm opacity-60 mt-1">{tab.name}</p>
      </div>
    </div>
  );
}
