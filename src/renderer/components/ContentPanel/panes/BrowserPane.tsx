import type { BrowserTab } from '../types';

interface BrowserPaneProps {
  tab: BrowserTab;
  isActive: boolean;
}

export function BrowserPane({ tab, isActive }: BrowserPaneProps) {
  return (
    <div
      className={`flex-1 items-center justify-center text-muted-foreground bg-background ${isActive ? 'flex' : 'hidden'}`}
    >
      <div className="text-center">
        <p className="text-lg">Browser</p>
        <p className="text-sm opacity-60 mt-1">{tab.name}</p>
      </div>
    </div>
  );
}
