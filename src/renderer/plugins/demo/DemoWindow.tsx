import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { useRendererApp } from '../../core';

export default function DemoWindow() {
  const app = useRendererApp();
  const { t } = useTranslation('plugin.demo');
  const { windowId, repoPath, worktreePath } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      windowId: params.get('windowId') ?? 'unknown',
      repoPath: params.get('repoPath') ?? '—',
      worktreePath: params.get('worktreePath') ?? '—',
    };
  }, []);

  const handleClose = () => {
    app.window.close({ windowId });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background text-foreground">
      <h1 className="text-xl font-semibold">Demo Sub-Window</h1>
      <p className="text-sm text-muted-foreground">windowId: {windowId}</p>
      <p className="text-sm text-muted-foreground">
        {t('demo.repoPath')}: {repoPath}
      </p>
      <p className="text-sm text-muted-foreground">
        {t('demo.worktreePath')}: {worktreePath}
      </p>
      <Button variant="outline" onClick={handleClose}>
        {t('demo.closeWindow')}
      </Button>
    </div>
  );
}
