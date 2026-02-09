import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

class GitContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    const filePath = this.extractFilePath(uri);
    const workspaceRoot = this.getWorkspaceRoot();
    const relativePath = path.relative(workspaceRoot, filePath);

    const ref = this.extractRef(uri) || 'HEAD';

    try {
      return this.getGitFileContent(workspaceRoot, relativePath, ref);
    } catch (error) {
      return '';
    }
  }

  private extractFilePath(uri: vscode.Uri): string {
    return uri.fsPath;
  }

  private extractRef(uri: vscode.Uri): string | undefined {
    const query = uri.query;
    const match = query.match(/ref=([^&]+)/);
    return match ? match[1] : undefined;
  }

  private getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('Workspace not found');
    }
    return workspaceFolders[0].uri.fsPath;
  }

  private getGitFileContent(
    workspaceRoot: string,
    relativePath: string,
    ref: string = 'HEAD',
  ): string {
    try {
      // 从git获取指定版本文件内容
      return execSync(`git show ${ref}:"${relativePath}"`, {
        cwd: workspaceRoot,
        encoding: 'utf8',
      });
    } catch (error) {
      // 文件不存在于指定版本，返回空字符串
      return '';
    }
  }
}

class EmptyContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(_uri: vscode.Uri): string {
    return '';
  }
}

export function registerGitDiffProvider(
  context: vscode.ExtensionContext,
): void {
  const gitContentProvider = new GitContentProvider();
  const gitDisposable = vscode.workspace.registerTextDocumentContentProvider(
    'neovate-git',
    gitContentProvider,
  );
  context.subscriptions.push(gitDisposable);

  const emptyContentProvider = new EmptyContentProvider();
  const emptyDisposable = vscode.workspace.registerTextDocumentContentProvider(
    'neovate-empty',
    emptyContentProvider,
  );
  context.subscriptions.push(emptyDisposable);
}

/**
 * 获取文件在git中的状态
 * @param workspaceRoot 工作区根目录
 * @param relativePath 相对路径
 * @returns 文件状态对象
 */
function getGitFileStatus(
  workspaceRoot: string,
  relativePath: string,
): {
  inHead: boolean; // 文件是否存在于HEAD（已提交）
  inIndex: boolean; // 文件是否存在于索引（已暂存）
  isStaged: boolean; // 文件是否有暂存的更改
} {
  let inHead = false;
  let inIndex = false;

  try {
    // 检查文件是否在HEAD中（已提交）
    execSync(`git ls-files --error-unmatch "${relativePath}"`, {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    inHead = true;
  } catch {
    inHead = false;
  }

  try {
    // 检查文件是否在索引中（已暂存）
    execSync(`git ls-files --cached --error-unmatch "${relativePath}"`, {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    inIndex = true;
  } catch {
    inIndex = false;
  }

  let isStaged = false;
  if (inIndex) {
    try {
      // 获取暂存的文件列表
      const stagedFiles = execSync(`git diff --cached --name-only`, {
        cwd: workspaceRoot,
        encoding: 'utf8',
      })
        .split('\n')
        .filter((f) => f.trim().length > 0);
      isStaged = stagedFiles.includes(relativePath);
    } catch {
      isStaged = false;
    }
  }

  return { inHead, inIndex, isStaged };
}

/**
 * 显示git diff视图
 * 支持以下场景：
 * 1. 文件已删除
 * 2. 新建文件（未暂存）
 * 3. 已暂存的新增文件
 * 4. 已暂存的修改文件
 * 5. 普通修改（未暂存）
 */
export function showGitDiff(filePath: string) {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('Workspace not found');
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const relativePath = path.relative(workspaceRoot, filePath);

    // 获取文件在git中的详细状态
    const { inHead, inIndex, isStaged } = getGitFileStatus(
      workspaceRoot,
      relativePath,
    );

    // 检查文件是否存在于工作区
    const fileExists = fs.existsSync(filePath);

    let leftUri: vscode.Uri;
    let rightUri: vscode.Uri | undefined;
    let title: string;

    if (!fileExists) {
      // 文件已被删除
      if (inHead || inIndex) {
        leftUri = vscode.Uri.parse(`neovate-git:${filePath}`);
        rightUri = vscode.Uri.parse(`neovate-empty:${filePath}`);
        title = `Git Diff: ${path.basename(filePath)} (Deleted)`;
      } else {
        throw new Error(`File ${relativePath} does not exist`);
      }
    } else if (!inHead && !inIndex) {
      // 全新文件（未暂存）
      leftUri = vscode.Uri.parse(`neovate-empty:${filePath}`);
      rightUri = vscode.Uri.file(filePath);
      title = `Git Diff: ${path.basename(filePath)} (New)`;
    } else if (!inHead && inIndex) {
      // 已暂存的新增文件
      leftUri = vscode.Uri.parse(`neovate-empty:${filePath}`);
      rightUri = vscode.Uri.file(filePath);
      title = `Git Diff: ${path.basename(filePath)} (Staged)`;
    } else if (inHead && isStaged) {
      // 已暂存的修改文件
      leftUri = vscode.Uri.parse(`neovate-git:${filePath}`);
      rightUri = vscode.Uri.file(filePath);
      title = `Git Diff: ${path.basename(filePath)} (Staged)`;
    } else {
      // 普通修改（未暂存）
      leftUri = vscode.Uri.parse(`neovate-git:${filePath}`);
      rightUri = vscode.Uri.file(filePath);
      title = `Git Diff: ${path.basename(filePath)}`;
    }

    vscode.commands
      .executeCommand('vscode.diff', leftUri, rightUri, title, {
        preview: true,
        preserveFocus: false,
      })
      .then(undefined, (error) => {
        vscode.window.showErrorMessage(
          `Failed to open diff view: ${error.message}`,
        );
      });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show git diff: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
