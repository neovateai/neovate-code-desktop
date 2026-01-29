import path from 'path';
import { app } from 'electron';

const EXTENSION_DIR = 'extensions';
const VSIX_FILENAME = 'neovate-code-extension-0.0.1.vsix';

/**
 * 获取扩展目录的统一路径
 * 开发环境：项目根目录/assets/extensions
 * 打包环境：应用根目录/assets/extensions
 */
export function getExtensionsBasePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // 开发环境：项目根目录/assets/extensions
    return path.join(
      __dirname,
      '..',
      '..',
      'assets',
      EXTENSION_DIR,
      VSIX_FILENAME,
    );
  } else {
    // 打包环境：应用根目录/assets/extensions（asar 内）
    // __dirname = app.asar/dist/main/code-server，需要回到 app.asar/dist/
    return path.join(
      __dirname,
      '..',
      '..',
      'assets',
      EXTENSION_DIR,
      VSIX_FILENAME,
    );
  }
}
