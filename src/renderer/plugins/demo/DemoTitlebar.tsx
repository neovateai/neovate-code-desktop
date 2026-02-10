import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TitlebarItemProps } from '../../core/plugin';

export default function DemoTitlebar({ app }: TitlebarItemProps) {
  const { t } = useTranslation('plugin.demo');
  const repoPath = app.useStore((s) => s.selectedRepoPath);
  const worktreePath = app.useStore((s) =>
    s.selectedWorkspaceId
      ? s.workspaces[s.selectedWorkspaceId]?.worktreePath
      : undefined,
  );

  const handleClick = () => {
    const id = `demo-${Date.now()}`;
    app.window.open({
      windowId: id,
      windowType: 'demo',
      width: 600,
      height: 400,
      title: 'Demo Sub-Window',
      parent: true,
      urlSearchParams: {
        repoPath: repoPath ?? '',
        worktreePath: worktreePath ?? '',
      },
    });
  };

  return (
    <button
      type="button"
      className="flex items-center gap-1 h-7 px-2 rounded text-xs hover:bg-accent"
      title={t('demo.newWindow')}
      onClick={handleClick}
    >
      <Plus className="h-3.5 w-3.5" />
      {t('demo.newWindow')}
    </button>
  );
}
