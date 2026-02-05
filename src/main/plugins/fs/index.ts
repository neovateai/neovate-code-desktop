import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '@neovate/code';
import { getFileTree } from './tree';
import { searchFiles } from './search';
import { bridgeServer } from '../../code-server/bridge';

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
      'editor.open': async (data: {
        cwd: string;
        filePath: string;
        line?: number;
      }) => {
        /** TODO: 先放这里，后面看是不是提取到另一个插件中 */
        const { cwd = '', filePath = '', line } = data || {};
        bridgeServer.send(
          { operationType: 'editor.open', params: { filePath, line } },
          cwd,
        );
        return {
          success: true,
          data: {},
        };
      },
      'editor.theme.set': (data: { cwd: string; theme: string }) => {
        const { cwd = '', theme = '' } = data || {};
        bridgeServer.send(
          { operationType: 'editor.theme.set', params: { theme } },
          cwd,
        );
        return {
          success: true,
          data: {},
        };
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
    } as ReturnType<NonNullable<Plugin['nodeBridgeHandler']>>;
  },
};
