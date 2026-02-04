import path from 'node:path';
import type { Plugin } from '@neovate/code';
import git from 'simple-git';

export const scmPlugin: Plugin = {
  name: 'scm',

  nodeBridgeHandler() {
    return {
      'scm.panel': async (data: { cwd: string }) => {
        try {
          const [working, staged] = await Promise.all([
            getWorkingFiles(data.cwd),
            getStagedFiles(data.cwd),
          ]);

          return { success: true, data: { working, staged } };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
      'scm.add': async (data: { cwd: string; fullPath: string }) => {
        try {
          const gitClient = git(data.cwd);
          await gitClient.add(data.fullPath);

          return { success: true, data: {} };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
      'scm.reset': async (data: { cwd: string; fullPath: string }) => {
        try {
          const gitClient = git(data.cwd);
          await gitClient.reset(['HEAD', data.fullPath]);

          return { success: true, data: {} };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
      'scm.checkout': async (data: { cwd: string; fullPath: string }) => {
        try {
          const gitClient = git(data.cwd);
          await gitClient.checkout([data.fullPath]);

          return { success: true, data: {} };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
    } as ReturnType<NonNullable<Plugin['nodeBridgeHandler']>>;
  },
};

function str2file(cwd: string, file: string) {
  return {
    fullPath: path.resolve(cwd, file),
    relPath: file,
    fileName: path.basename(file),
    extName: path.extname(file).replace('.', ''),
  };
}

async function getWorkingFiles(cwd: string) {
  const gitClient = git(cwd);
  const status = await gitClient.status();

  // 获取未暂存的已修改文件
  const modifiedFiles = status.modified
    .filter((file) => !status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'modified',
    }));

  // 获取未暂存的已删除文件
  const deletedFiles = status.deleted
    .filter((file) => !status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'deleted',
    }));

  // 获取未跟踪的文件（未暂存）
  const untrackedFiles = status.not_added
    .filter((file) => !status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'untracked',
    }));

  const allFiles = [...modifiedFiles, ...deletedFiles, ...untrackedFiles];
  return allFiles;
}

async function getStagedFiles(cwd: string) {
  const gitClient = git(cwd);
  const status = await gitClient.status();

  // 获取已暂存的文件，区分新增、修改、删除状态
  const stagedAdded = status.created
    .filter((file) => status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'added',
      staged: true,
    }));

  const stagedModified = status.modified
    .filter((file) => status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'modified',
      staged: true,
    }));

  const stagedDeleted = status.deleted
    .filter((file) => status.staged.includes(file))
    .map((file) => ({
      ...str2file(cwd, file),
      status: 'deleted',
      staged: true,
    }));

  const allStagedFiles = [...stagedAdded, ...stagedModified, ...stagedDeleted];

  return allStagedFiles;
}
