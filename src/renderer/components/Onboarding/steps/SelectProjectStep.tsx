import { useStore } from '../../../store';
import { Button } from '../../ui/button';

export const SelectProjectStep = () => {
  const repos = useStore((state) => state.repos);
  const selectRepo = useStore((state) => state.selectRepo);
  const completeOnboarding = useStore((state) => state.completeOnboarding);

  const repoList = Object.values(repos);

  const handleSelectProject = (path: string) => {
    selectRepo(path);
    completeOnboarding();
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString();
  };

  if (repoList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">No projects available yet.</p>
        <p className="text-sm text-center text-muted-foreground">
          You can add projects after completing setup by clicking the "+" button
          in the sidebar.
        </p>
        <Button variant="default" size="sm" onClick={completeOnboarding}>
          Continue Without Project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a project to start working with:
      </p>

      {/* Project list */}
      <div className="rounded-lg overflow-hidden border border-border max-h-[300px] overflow-y-auto">
        {repoList.map((repo: any) => (
          <button
            key={repo.path}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border bg-transparent hover:bg-accent"
            onClick={() => handleSelectProject(repo.path)}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground">
              {(repo.name ||
                repo.path.split('/').pop() ||
                '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">
                {repo.name || repo.path.split('/').pop()}
              </div>
              <div className="text-xs truncate text-muted-foreground">
                {repo.path}
              </div>
            </div>
            {repo.metadata?.lastAccessed && (
              <div className="text-xs text-muted-foreground">
                {formatDate(repo.metadata.lastAccessed)}
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Click a project to select it and complete setup
      </p>
    </div>
  );
};
