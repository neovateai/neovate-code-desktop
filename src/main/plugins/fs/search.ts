import fs from 'node:fs';
import path from 'node:path';
import { search as ripgrepSearch } from '../../code-server/ripgrep';

export interface SearchResult {
  fullPath: string;
  relPath: string;
  fileName: string;
  extName: string;
  matches?: Array<{
    line: number;
    column: number;
    text: string;
  }>;
}

export async function searchFiles(
  cwd: string,
  query: string,
  options: { caseSensitive?: boolean; exactMatch?: boolean } = {},
): Promise<SearchResult[]> {
  const { caseSensitive = false, exactMatch = false } = options;

  try {
    if (!query) {
      throw new Error('Query is required');
    }
    if (!cwd || !fs.existsSync(cwd)) {
      throw new Error('Invalid working directory');
    }

    // 使用 ripgrep 进行搜索
    const searchResults = await ripgrepSearch({
      keyword: query,
      searchPath: cwd,
      exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      caseSensitive,
      wholeWord: exactMatch,
    });

    const fileMap = new Map<string, SearchResult>();

    // 解析 ripgrep 的输出格式：file:line:column:text
    for (const line of searchResults) {
      if (!line.trim()) continue;

      const parts = line.split(':');
      if (parts.length < 4) continue;

      const [filePath, lineNum, colNum, ...textParts] = parts;
      const fullPath = path.resolve(cwd, filePath);
      const relPath = path.relative(cwd, fullPath);
      const fileName = path.basename(fullPath);
      const extName = path.extname(fullPath);
      const text = textParts.join(':').trim();

      if (!fileMap.has(fullPath)) {
        fileMap.set(fullPath, {
          fullPath,
          relPath,
          fileName,
          extName,
          matches: [],
        });
      }

      const result = fileMap.get(fullPath);
      if (result?.matches) {
        const lineNumber = parseInt(lineNum, 10);
        // 避免同一行的重复匹配
        if (!result.matches.some((match) => match.line === lineNumber)) {
          result.matches.push({
            line: lineNumber,
            column: parseInt(colNum, 10),
            text,
          });
        }
      }
    }

    // 按文件名排序
    const sortedResults = Array.from(fileMap.values()).sort((a, b) => {
      return a.fileName.localeCompare(b.fileName);
    });
    return sortedResults;
  } catch (error) {
    console.error(
      'Ripgrep search failed, falling back to basic search:',
      error,
    );
    return basicFileSearch(cwd, query, options); // 如果 ripgrep 不可用，使用基本的文件搜索
  }
}

async function basicFileSearch(
  cwd: string,
  query: string,
  options: { caseSensitive?: boolean; exactMatch?: boolean } = {},
): Promise<SearchResult[]> {
  const { caseSensitive = false, exactMatch = false } = options;
  const results: SearchResult[] = [];

  function searchDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // 跳过 node_modules 等目录
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          searchDirectory(filePath);
        }
      } else {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          const matches: Array<{ line: number; column: number; text: string }> =
            [];

          lines.forEach((line, index) => {
            let searchLine = line;
            let searchQuery = query;

            if (!caseSensitive) {
              searchLine = line.toLowerCase();
              searchQuery = query.toLowerCase();
            }

            let column = -1;
            if (exactMatch) {
              // 精确匹配：使用正则表达式匹配整个单词
              const flags = caseSensitive ? 'g' : 'gi';
              const regex = new RegExp(
                `\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
                flags,
              );
              const match = regex.exec(line);
              if (match) {
                column = match.index;
              }
            } else {
              // 普通匹配
              column = searchLine.indexOf(searchQuery);
            }

            if (column !== -1) {
              matches.push({
                line: index + 1,
                column: column + 1,
                text: line.trim(),
              });
            }
          });

          if (matches.length > 0) {
            const relPath = path.relative(cwd, filePath);
            results.push({
              fullPath: filePath,
              relPath: relPath,
              fileName: file,
              extName: path.extname(filePath),
              matches,
            });
          }
        } catch (e) {
          // 忽略无法读取的文件
        }
      }
    }
  }

  searchDirectory(cwd);
  return results;
}
