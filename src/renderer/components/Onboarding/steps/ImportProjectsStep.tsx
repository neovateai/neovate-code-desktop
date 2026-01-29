import { useEffect, useState } from 'react';
import { useStore } from '../../../store';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Spinner } from '../../ui/spinner';

interface Project {
  path: string;
  lastAccessed: number | null;
  sessionCount: number;
}

export const ImportProjectsStep = () => {
  const request = useStore((state) => state.request);
  const connectionState = useStore((state) => state.state);
  const setImportedProjects = useStore((state) => state.setImportedProjects);
  const addRepo = useStore((state) => state.addRepo);
  const addWorkspace = useStore((state) => state.addWorkspace);
  const repos = useStore((state) => state.repos);

  // Set of project paths already added to the store
  const existingPaths = new Set(Object.keys(repos));

  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  // Load projects from CLI
  useEffect(() => {
    const loadProjects = async () => {
      if (connectionState !== 'connected') {
        setLoading(false);
        return;
      }

      try {
        const result = await request('projects.list', {
          cwd: '/tmp',
          includeSessionDetails: false,
        });

        if (result.success && result.data?.projects) {
          setProjects(result.data.projects);
          // Auto-select all projects (including already-added ones)
          setSelected(
            new Set(result.data.projects.map((p: Project) => p.path)),
          );
        } else {
          setError(result.error || 'Failed to load projects');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load projects',
        );
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [request, connectionState]);

  const toggleProject = (path: string) => {
    // Don't allow toggling already-added projects
    if (existingPaths.has(path)) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === projects.length) {
      // Uncheck all except already-added projects
      setSelected(
        new Set(
          projects.filter((p) => existingPaths.has(p.path)).map((p) => p.path),
        ),
      );
    } else {
      setSelected(new Set(projects.map((p) => p.path)));
    }
  };

  const handleImport = async () => {
    // Get new projects to import (skip already-added ones)
    const projectsToImport = [...selected]
      .filter((path) => !existingPaths.has(path))
      .map((path) => projects.find((p) => p.path === path))
      .filter((p): p is Project => p !== undefined);

    if (projectsToImport.length === 0) return;

    setImporting(true);

    for (const project of projectsToImport) {
      try {
        // Get repo info from backend
        const repoResponse = await request('project.getRepoInfo', {
          cwd: project.path,
        });

        if (repoResponse.success && repoResponse.data?.repoData) {
          const repoData = repoResponse.data.repoData;
          addRepo(repoData);

          // Fetch and add workspaces
          try {
            const workspacesResponse = await request(
              'project.workspaces.list',
              {
                cwd: project.path,
              },
            );

            if (
              workspacesResponse.success &&
              workspacesResponse.data?.workspaces
            ) {
              for (const workspace of workspacesResponse.data.workspaces) {
                addWorkspace(workspace);
              }
            }
          } catch (workspaceError) {
            console.warn(
              'Error fetching workspaces for',
              project.path,
              workspaceError,
            );
          }
        } else {
          console.warn(
            'Failed to get repo info for',
            project.path,
            repoResponse.error,
          );
        }
      } catch (err) {
        console.warn('Error importing project', project.path, err);
      }
    }

    // Store imported projects for later steps
    const importedProjects = projects.filter((p) => selected.has(p.path));
    setImportedProjects(importedProjects);
    setImporting(false);
    setImported(true);
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  if (connectionState !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner className="h-6 w-6" />
        <p className="text-muted-foreground">Connecting to server...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner className="h-6 w-6" />
        <p className="text-muted-foreground">Loading projects from CLI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">
          You can skip this step and add projects manually later.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">
          No projects found from CLI usage.
        </p>
        <p className="text-sm text-muted-foreground">
          You can skip this step and add projects manually later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We found {projects.length} project{projects.length !== 1 ? 's' : ''}{' '}
        from your CLI usage. Select which ones to import:
      </p>

      {/* Select all toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={() => setSelected(new Set(projects.map((p) => p.path)))}
          >
            Select All
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              setSelected(
                new Set(
                  projects
                    .filter((p) => existingPaths.has(p.path))
                    .map((p) => p.path),
                ),
              )
            }
          >
            Uncheck All
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {selected.size} of {projects.length} selected
        </span>
      </div>

      {/* Project list */}
      <div className="rounded-lg overflow-hidden border border-border max-h-[250px] overflow-y-auto">
        {projects.map((project) => {
          const isAlreadyAdded = existingPaths.has(project.path);
          return (
            <label
              key={project.path}
              className={`flex items-center gap-3 px-4 py-3 transition-colors border-b border-border ${
                selected.has(project.path) ? 'bg-background' : 'bg-transparent'
              } ${isAlreadyAdded ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent'}`}
            >
              <Checkbox
                checked={selected.has(project.path)}
                onCheckedChange={() => toggleProject(project.path)}
                disabled={isAlreadyAdded}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2 text-foreground">
                  {project.path.split('/').pop()}
                  {isAlreadyAdded && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Added
                    </span>
                  )}
                </div>
                <div className="text-xs truncate text-muted-foreground">
                  {project.path}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-xs text-muted-foreground">
                  {formatDate(project.lastAccessed)}
                </div>
                {project.sessionCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {project.sessionCount} session
                    {project.sessionCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Import button */}
      <div className="flex justify-end">
        <Button
          variant={imported ? 'outline' : 'default'}
          size="sm"
          onClick={handleImport}
          disabled={
            importing ||
            selected.size === 0 ||
            [...selected].every((p) => existingPaths.has(p))
          }
        >
          {importing ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-3 w-3" />
              Importing...
            </span>
          ) : imported ? (
            'Imported ✓'
          ) : (
            (() => {
              const newCount = [...selected].filter(
                (p) => !existingPaths.has(p),
              ).length;
              return newCount === 0
                ? 'No New Projects'
                : `Import ${newCount} Project${newCount !== 1 ? 's' : ''}`;
            })()
          )}
        </Button>
      </div>
    </div>
  );
};
