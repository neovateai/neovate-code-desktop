import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SidebarPanelProps } from '../../core/plugin';

const notes = [
  {
    id: '1',
    title: 'Getting Started',
    preview: 'Welcome to the Notes plugin...',
  },
  { id: '2', title: 'TODO List', preview: '- Review PR\n- Fix bug...' },
];

export default function DemoSidebar({ app }: SidebarPanelProps) {
  const { t } = useTranslation('plugin.demo');
  const repoPath = app.useStore((s) => s.selectedRepoPath);
  const worktreePath = app.useStore((s) =>
    s.selectedWorkspaceId
      ? s.workspaces[s.selectedWorkspaceId]?.worktreePath
      : undefined,
  );

  return (
    <div className="flex flex-col h-full">
      {/* i18n & store demo */}
      <div className="p-3 border-b border-border text-xs text-muted-foreground space-y-1">
        <p>{t('demo.message')}</p>
        <p>
          {t('demo.repoPath')}: {repoPath ?? '—'}
        </p>
        <p>
          {t('demo.worktreePath')}: {worktreePath ?? '—'}
        </p>
      </div>

      {/* Static notes list */}
      <div className="flex-1 overflow-auto">
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="p-3 hover:bg-accent cursor-pointer">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {note.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {note.preview}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
