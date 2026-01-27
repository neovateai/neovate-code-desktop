import path from 'node:path';
import { getCodeServerBinaryPath } from './constants';

/**
 * 基于code server 产物进行调用启动
 */
export async function codeServerStarter(opts: {
  port: number;
  extDir: string;
  dataDir: string;
}) {
  const { port, extDir, dataDir } = opts;
  try {
    const resourcePath = getCodeServerBinaryPath();
    const wrapperJS = path.join(resourcePath, 'out', 'node', 'wrapper.js');
    const cliJS = path.join(resourcePath, 'out', 'node', 'cli.js');
    const { wrapper } = await import(wrapperJS);
    const { setDefaults } = await import(cliJS);
    const functionArgs = {
      port,
      host: '127.0.0.1',
      auth: 'none',
      'extensions-dir': extDir,
      'user-data-dir': dataDir,
    };
    const mergedArgs = await setDefaults(functionArgs);
    return wrapper.start(mergedArgs);
  } catch (e) {
    console.error(`Code Server Starter Failed: ${e}`);
  }
}
