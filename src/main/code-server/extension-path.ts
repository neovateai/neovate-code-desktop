import { app } from 'electron';
import path from 'path';

declare const __ASSETS_PATH__: string | undefined;

const EXTENSION_DIR = 'extensions';
const VSIX_FILENAME = 'neovate-code-extension-0.0.7.vsix';

/**
 * 获取扩展目录的统一路径
 * 开发环境：由各自 vite config 的 define 注入 __ASSETS_PATH__，默认 __dirname/../../assets
 * 打包环境：应用根目录/assets/extensions
 */
export function getExtensionsBasePath(): string {
  if (!app.isPackaged) {
    const assetsPath =
      typeof __ASSETS_PATH__ !== 'undefined'
        ? __ASSETS_PATH__
        : path.join(__dirname, '..', '..', 'assets');
    return path.join(assetsPath, EXTENSION_DIR, VSIX_FILENAME);
  }
  return path.join(
    __dirname,
    '..',
    '..',
    'assets',
    EXTENSION_DIR,
    VSIX_FILENAME,
  );
}
