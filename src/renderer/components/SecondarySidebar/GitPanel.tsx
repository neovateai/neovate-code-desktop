import { memo, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useGit } from './useGit';
import type { GitFile } from './useGit';

import '../../styles/seti.css';

export const GitPanel = memo(function GitPanel() {
  const { t } = useTranslation();
  const { request } = useStore();
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);
  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath
    : null;

  const [workingCollapsed, setWorkingCollapsed] = useState(false);
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const {
    loading,
    workingFiles,
    stagedFiles,
    refreshGitStatus,
    clearStaged,
    revertAll,
    stageAll,
    add2stage,
    removeFromStage,
    revert,
  } = useGit(cwd || '');

  useEffect(() => {
    if (!cwd) return;
    refreshGitStatus(cwd);
  }, [cwd]);

  const getFileIcon = (extName: string) => {
    const suffix = extName.startsWith('.') ? extName.slice(1) : extName;
    return (
      <div
        className="seti-icon"
        data-lang={suffix.toLowerCase()}
        style={{ fontSize: 14 }}
      ></div>
    );
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'modified':
        return <span className="text-xs font-medium text-yellow-600">M</span>;
      case 'deleted':
        return <span className="text-xs font-medium text-red-600">D</span>;
      case 'untracked':
        return <span className="text-xs font-medium text-green-600">U</span>;
      case 'added':
        return <span className="text-xs font-medium text-green-600">A</span>;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified':
        return 'text-yellow-600';
      case 'deleted':
        return 'text-red-600 line-through';
      case 'untracked':
      case 'added':
        return 'text-green-600';
      default:
        return 'text-foreground';
    }
  };

  const showDiff = (filePath: string) => {
    request<any>('editor.diff', { cwd, filePath });
  };

  const renderFileList = (
    files: GitFile[],
    collapsed: boolean,
    toggleCollapsed: () => void,
    title: string,
    isStaged: boolean = false,
  ) => {
    if (files.length === 0) return null;

    return (
      <>
        <div
          className="px-3 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-accent/50 select-none"
          onClick={toggleCollapsed}
        >
          <h3 className="text-sm text-muted-foreground">
            {title} ({files.length})
          </h3>
          <div className="flex items-center gap-1">
            {isStaged && files.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearStaged();
                }}
                className="p-1 hover:bg-accent rounded"
                title={t('git.removeAllFromStage')}
                disabled={loading}
              >
                <ArrowDown className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground" />
              </button>
            )}
            {!isStaged && files.length > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stageAll();
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title={t('git.addAllToStage')}
                  disabled={loading}
                >
                  <ArrowUp className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    revertAll();
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title={t('git.revertAllFiles')}
                  disabled={loading}
                >
                  <Undo2 className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground" />
                </button>
              </>
            )}
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.fullPath}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 border-b border-border/50 cursor-pointer"
                title={file.relPath}
                onClick={() => showDiff(file.fullPath)}
              >
                <div className="flex-shrink-0">{getFileIcon(file.extName)}</div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${getStatusColor(file.status)}`}
                  >
                    {file.fileName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {file.relPath}
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                  {getStatusText(file.status)}

                  {isStaged ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromStage(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title={t('git.removeFromStage')}
                      >
                        <ArrowDown className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          revert(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title={t('git.revertFile')}
                      >
                        <Undo2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          add2stage(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title={t('git.addToStage')}
                      >
                        <ArrowUp className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          revert(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title={t('git.revertFile')}
                      >
                        <Undo2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  if (!cwd) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        {t('git.selectWorkspace')}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('git.loadingStatus')}
          </p>
        </div>
      </div>
    );
  }

  const hasChanges = workingFiles.length > 0 || stagedFiles.length > 0;
  if (!hasChanges) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        {t('git.noChanges')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          {t('git.status')}
        </span>
        <button
          onClick={() => refreshGitStatus(cwd)}
          className="p-0.5 hover:bg-accent/50 rounded"
          title={t('git.refreshStatus')}
          disabled={loading}
        >
          <RefreshCw
            className={`w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {renderFileList(
        stagedFiles,
        stagedCollapsed,
        () => setStagedCollapsed(!stagedCollapsed),
        t('git.stagedChanges'),
        true,
      )}
      {stagedFiles.length > 0 && workingFiles.length > 0 && (
        <div className="border-t border-border/50"></div>
      )}
      {renderFileList(
        workingFiles,
        workingCollapsed,
        () => setWorkingCollapsed(!workingCollapsed),
        t('git.workingChanges'),
        false,
      )}
    </div>
  );
});
