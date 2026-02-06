import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '@neovate/code';

import { editorControllers } from './editor';
import { getFileTree } from './tree';
import { searchFiles } from './search';

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
      'fs.delete': async (data: { path: string }) => {
        try {
          const { path } = data || {};
          if (!path) {
            return { success: false, error: 'Path is required' };
          }
          if (!fs.existsSync(path)) {
            return { success: false, error: 'File does not exist' };
          }
          const stats = fs.statSync(path);
          if (stats.isDirectory()) {
            fs.rmSync(path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(path);
          }
          return { success: true, data: {} };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
      'fs.rename': async (data: { oldPath: string; newPath: string }) => {
        try {
          const { oldPath, newPath } = data || {};
          if (!oldPath || !newPath) {
            return {
              success: false,
              error: 'Both oldPath and newPath are required',
            };
          }
          if (!fs.existsSync(oldPath)) {
            return { success: false, error: 'Source file does not exist' };
          }
          if (fs.existsSync(newPath)) {
            return { success: false, error: 'Target file already exists' };
          }
          const newDir = path.dirname(newPath);
          if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
          }
          fs.renameSync(oldPath, newPath);
          return { success: true, data: {} };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      },
      'keyword.search': async (data: {
        cwd: string;
        query: string;
        caseSensitive?: boolean;
        exactMatch?: boolean;
      }) => {
        try {
          const {
            cwd = '',
            query = '',
            caseSensitive = false,
            exactMatch = false,
          } = data || {};
          if (!query) {
            return { success: false, error: 'Query is required' };
          }
          if (!cwd || !fs.existsSync(cwd)) {
            return { success: false, error: 'Invalid working directory' };
          }
          const results = await searchFiles(cwd, query, {
            caseSensitive,
            exactMatch,
          });
          return { success: true, data: { results } };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Search failed',
          };
        }
      },
      ...editorControllers,
    } as ReturnType<NonNullable<Plugin['nodeBridgeHandler']>>;
  },
};
