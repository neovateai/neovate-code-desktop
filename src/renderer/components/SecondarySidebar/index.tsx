import { useStore } from '../../store';
import { FileTree } from './FileTree';
import { GitPanel } from './GitPanel';

export function SecondarySidebar() {
  const secondarySidebarTab = useStore((s) => s.secondarySidebarTab);

  const panelTitle =
    secondarySidebarTab === 'files'
      ? 'Files'
      : secondarySidebarTab === 'git'
        ? 'Git'
        : '';

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
      </div>
    </div>
  );
}
