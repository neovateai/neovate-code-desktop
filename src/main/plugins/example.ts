/**
 * Example Plugin for @neovate/code SDK
 */

import type { Plugin } from '@neovate/code';

export const examplePlugin: Plugin = {
  name: 'example',

  nodeBridgeHandler() {
    return {
      'example.hello': async (data: { cwd: string; name?: string }) => {
        return {
          success: true,
          data: { message: `Hello, ${data.name || 'World'}!` },
        };
      },
    } as ReturnType<NonNullable<Plugin['nodeBridgeHandler']>>;
  },
};
