import { memo, useEffect, useState } from 'react';
import {
  PlusCircle,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../../store';
import './index.css';

interface GitFile {
  extName: string;
  fileName: string;
  fullPath: string;
  relPath: string;
  status: 'modified' | 'deleted' | 'untracked' | 'added';
  staged?: boolean;
}

export const GitPanel = memo(function GitPanel() {
  const { request } = useStore();
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);
  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath
    : null;
  const [workingFiles, setWorkingFiles] = useState<GitFile[]>([]);
  const [stagedFiles, setStagedFiles] = useState<GitFile[]>([]);
  const [workingCollapsed, setWorkingCollapsed] = useState(false);
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cwd) return;
    refreshGitStatus(cwd);
  }, [cwd]);

  const refreshGitStatus = async (workingDir: string) => {
    setLoading(true);
    try {
      const res = await request<any>('scm.panel', { cwd: workingDir });
      console.log('scm.panel', res);
      setWorkingFiles(res?.data?.working || []);
      setStagedFiles(res?.data?.staged || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToStage = async (file: GitFile) => {
    if (!cwd) return;

    try {
      await request<any>('scm.add', { cwd, fullPath: file.fullPath });
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to add file to stage:', error);
    }
  };

  const handleRemoveFromStage = async (file: GitFile) => {
    if (!cwd) return;

    try {
      await request<any>('scm.reset', { cwd, fullPath: file.fullPath });
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to remove file from stage:', error);
    }
  };

  const handleRevertFile = async (file: GitFile) => {
    if (!cwd) return;

    try {
      // 对于未跟踪的文件，直接删除
      if (file.status === 'untracked') {
        await request<any>('fs.delete', { path: file.fullPath });
      } else {
        // 对于已跟踪的文件，使用git checkout还原
        await request<any>('scm.checkout', { cwd, fullPath: file.fullPath });
      }
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to revert file:', error);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified':
        return <Edit3 className="w-3 h-3 text-yellow-500" />;
      case 'deleted':
        return <Trash2 className="w-3 h-3 text-red-500" />;
      case 'untracked':
      case 'added':
        return <PlusCircle className="w-3 h-3 text-green-500" />;
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
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {!collapsed && (
          <div className="overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.fullPath}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 border-b border-border/50"
                title={file.relPath}
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
                  {getStatusIcon(file.status)}

                  {isStaged ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromStage(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title="从暂存区移除"
                      >
                        <ArrowDown className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertFile(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title="还原文件"
                      >
                        <RotateCcw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToStage(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title="添加到暂存区"
                      >
                        <ArrowUp className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertFile(file);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title="还原文件"
                      >
                        <RotateCcw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
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
        请选择一个工作区
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在加载Git状态...</p>
        </div>
      </div>
    );
  }

  const hasChanges = workingFiles.length > 0 || stagedFiles.length > 0;
  if (!hasChanges) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        没有检测到变更的文件
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">Git 状态</span>
        <button
          onClick={() => refreshGitStatus(cwd)}
          className="p-0.5 hover:bg-accent/50 rounded"
          title="刷新状态"
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
        '暂存区变更',
        true,
      )}
      {stagedFiles.length > 0 && workingFiles.length > 0 && (
        <div className="border-t border-border/50"></div>
      )}
      {renderFileList(
        workingFiles,
        workingCollapsed,
        () => setWorkingCollapsed(!workingCollapsed),
        '工作区变更',
        false,
      )}
    </div>
  );
});
