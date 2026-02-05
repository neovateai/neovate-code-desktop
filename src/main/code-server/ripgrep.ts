import path from 'node:path';
import fs from 'node:fs';
import { getCodeServerBinaryPath } from './constants';
import { execFile } from 'node:child_process';

async function getVSCodeRipgrepPath() {
  const resource = getCodeServerBinaryPath();
  const rgPath = path.join(
    resource,
    'lib',
    'vscode',
    'node_modules',
    '@vscode',
    'ripgrep',
    'bin',
    'rg',
  );
  const pathExists = async (filePath: string): Promise<string | null> => {
    try {
      await fs.promises.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  };
  const exists = await pathExists(rgPath);
  if (exists) {
    return rgPath;
  }
  return '';
}

async function ripGrep(args: string[], target: string): Promise<string[]> {
  const rg = await getVSCodeRipgrepPath();
  if (!rg) {
    throw new Error('ripgrepPath not exist');
  }
  return new Promise((resolve) => {
    execFile(
      rg,
      [...args, target],
      {
        maxBuffer: 10_000_000, // 增加到10MB，避免高频字符搜索缓冲区溢出
        timeout: 20_000,
      },
      (err, stdout) => {
        if (err) {
          console.log(`[Ripgrep] Error: ${err}`);
          resolve([]);
        } else {
          resolve(stdout.trim().split('\n').filter(Boolean));
        }
      },
    );
  });
}

export interface SearchOptions {
  keyword: string;
  searchPath: string;
  include?: string[];
  exclude?: string[];
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
}

export async function search(options: SearchOptions): Promise<string[]> {
  const {
    keyword,
    searchPath,
    include = [],
    exclude = [],
    caseSensitive = false,
    wholeWord = false,
    maxResults = 1000,
  } = options;

  const args: string[] = [];

  // 基本搜索参数
  args.push('--line-number');
  args.push('--column');
  args.push('--no-heading');
  args.push('--color=never');

  // 大小写敏感
  if (caseSensitive) {
    args.push('--case-sensitive');
  } else {
    args.push('--ignore-case');
  }

  // 全词匹配
  if (wholeWord) {
    args.push('--word-regexp');
  }

  // 包含文件类型
  if (include.length > 0) {
    include.forEach((pattern) => {
      args.push('--glob', pattern);
    });
  }

  // 排除文件类型
  if (exclude.length > 0) {
    exclude.forEach((pattern) => {
      args.push('--glob', `!${pattern}`);
    });
  }

  // 限制结果数量
  args.push('--max-count', maxResults.toString());

  // 搜索关键词和路径
  args.push(keyword);
  args.push(searchPath);

  return ripGrep(args, searchPath);
}
