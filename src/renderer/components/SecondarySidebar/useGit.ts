import { useState } from 'react';
import { useStore } from '../../store';

export interface GitFile {
  extName: string;
  fileName: string;
  fullPath: string;
  relPath: string;
  status: 'modified' | 'deleted' | 'untracked' | 'added';
  staged?: boolean;
}

export function useGit(cwd: string) {
  const [workingFiles, setWorkingFiles] = useState<GitFile[]>([]);
  const [stagedFiles, setStagedFiles] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { request } = useStore();

  const refreshGitStatus = async (workingDir: string) => {
    setLoading(true);
    try {
      const res = await request<any>('scm.panel', { cwd: workingDir });
      setWorkingFiles(res?.data?.working || []);
      setStagedFiles(res?.data?.staged || []);
    } finally {
      setLoading(false);
    }
  };

  const clearStaged = async () => {
    if (!cwd || stagedFiles.length === 0) return;

    setLoading(true);
    try {
      console.log('Clearing staged files:', stagedFiles);
      await request<any>('scm.reset', {
        cwd,
        files: stagedFiles.map((f) => f.fullPath),
      });
      await refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to remove all files from stage:', error);
    } finally {
      setLoading(false);
    }
  };

  const revertAll = async () => {
    if (!cwd) return;

    setLoading(true);
    try {
      const allFiles = [...workingFiles, ...stagedFiles];

      // 分离未跟踪文件和已跟踪文件
      const untrackedFiles = allFiles.filter((f) => f.status === 'untracked');
      const trackedFiles = allFiles.filter((f) => f.status !== 'untracked');

      // 批量删除未跟踪文件
      if (untrackedFiles.length > 0) {
        await Promise.all(
          untrackedFiles.map((file) =>
            request<any>('fs.delete', { path: file.fullPath }),
          ),
        );
      }

      // 批量还原已跟踪文件
      if (trackedFiles.length > 0) {
        await request<any>('scm.checkout', {
          cwd,
          files: trackedFiles.map((f) => f.fullPath),
        });
      }

      await refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to revert all files:', error);
    } finally {
      setLoading(false);
    }
  };

  const revert = async (file: GitFile) => {
    if (!cwd) return;

    try {
      // 对于未跟踪的文件，直接删除
      if (file.status === 'untracked') {
        await request<any>('fs.delete', { path: file.fullPath });
      } else {
        // 对于已跟踪的文件，使用git checkout还原
        await request<any>('scm.checkout', { cwd, files: [file.relPath] });
      }
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to revert file:', error);
    }
  };

  const add2stage = async (file: GitFile) => {
    if (!cwd) return;

    try {
      await request<any>('scm.add', { cwd, files: [file.relPath] });
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to add file to stage:', error);
    }
  };

  const removeFromStage = async (file: GitFile) => {
    if (!cwd) return;

    try {
      await request<any>('scm.reset', { cwd, files: [file.relPath] });
      refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to remove file from stage:', error);
    }
  };

  const stageAll = async () => {
    if (!cwd || workingFiles.length === 0) return;

    setLoading(true);
    try {
      await request<any>('scm.add', {
        cwd,
        files: workingFiles.map((f) => f.relPath),
      });
      await refreshGitStatus(cwd);
    } catch (error) {
      console.error('Failed to add all files to stage:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
