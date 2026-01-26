import type { EditorTab } from '../types';

interface EditorPaneProps {
  tab: EditorTab;
  isActive: boolean;
}

export function EditorPane({ tab, isActive }: EditorPaneProps) {
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
        <p className="text-lg">Editor</p>
        <p className="text-sm opacity-60 mt-1">{tab.name}</p>
      </div>
    </div>
  );
}
