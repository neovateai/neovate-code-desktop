import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '@neovate/code';
import { minimatch } from 'minimatch';
import { bridgeServer } from '../code-server/bridge';

export const fsPlugin: Plugin = {
  name: 'fs',

  nodeBridgeHandler() {
    return {
      'fs.tree': async (data: { cwd: string }) => {
        /** TODO: 后续考虑大项目的性能问题 */
        return {
          success: true,
          data: { tree: getFileTree(data?.cwd) },
        };
      },
      'editor.open': async (data: { cwd: string; filePath: string }) => {
        /** TODO: 先放这里，后面看是不是提取到另一个插件中 */
        const { cwd = '', filePath = '' } = data || {};
        bridgeServer.send(
          { operationType: 'editor.open', params: { filePath } },
          cwd,
        );
        return {
          success: true,
          data: {},
        };
      },
    } as ReturnType<NonNullable<Plugin['nodeBridgeHandler']>>;
  },
};

interface FileTreeNode {
  fileName: string;
  fullPath: string;
  isFolder: boolean;
  children?: FileTreeNode[];
  relPath: string;
  languageId?: string;
}

const EXCLUDE_FILE_TYPE_PATTERN = [
  '**/node_modules',
  '**/node_modules/**',
  /** 编译产物忽略 */
  '**/dist',
  '**/dist/**',
  '**/.*/**',
  '**/.*',
];

function getExcludePatterns(): string[] {
  // const gitignorePatterns = getGitignorePatterns();
  const allPatterns = [...EXCLUDE_FILE_TYPE_PATTERN];
  return [...new Set(allPatterns)];
}

function getFileTree(parent: string, root?: string): FileTreeNode[] {
  const includePatterns: string[] = [];
  const actualRoot = root || parent;

  const excludePatterns = getExcludePatterns();

  const dirFilePath = parent;
  const tree: FileTreeNode[] = [];
  const files = fs.readdirSync(dirFilePath);

  files.forEach((file) => {
    const filePath = path.join(dirFilePath, file);
    const stats = fs.statSync(filePath);
    const relativePath = path
      .relative(actualRoot, filePath)
      .replace(/\\/g, '/');

    const isExcluded = excludePatterns.some((pattern) =>
      minimatch(relativePath, pattern),
    );
    const isFolder = stats.isDirectory();
    const node: FileTreeNode = {
      fileName: file,
      fullPath: filePath,
      relPath: relativePath,
      isFolder,
    };

    if (isExcluded) {
      return;
    }

    if (!isFolder) {
      const isIncluded =
        includePatterns.length === 0 ||
        includePatterns.some((pattern) => minimatch(relativePath, pattern));
      if (!isIncluded) return;
      node.languageId = file.split('.').pop();
    } else {
      node.children = getFileTree(filePath, actualRoot);
    }

    if (node.isFolder && node.children?.length === 0) {
      return;
    }
    tree.push(node);
  });

  if (!tree || !Array.isArray(tree)) {
    return [];
  }

  const compareNodes = (a: FileTreeNode, b: FileTreeNode): number => {
    // 文件夹优先
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    // 按文件名排序（忽略大小写）
    return a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase());
  };

  const sortFileTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }

    return nodes.sort(compareNodes).map((node) => ({
      ...node,
      children:
        node.children && node.children.length > 0
          ? sortFileTree(node.children)
          : [],
    }));
  };

  return sortFileTree(tree);
}
