import fs from 'node:fs/promises';
import path from 'node:path';

import { getAsarUnpackPatterns } from './native-deps.config.mjs';

const isDev = process.env.BUILD_ENV === 'dev';
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration
 */
const config = {
  appId: isDev ? 'com.neovateai.desktop.dev' : 'com.neovateai.desktop',
  productName: isDev ? 'Neovate Dev' : 'Neovate',

  directories: {
    output: isDev ? 'release-dev' : 'release',
  },

  artifactName: isDev
    ? 'neovate-dev-${arch}.${ext}'
    : 'neovate-${version}-${arch}.${ext}',

  publish: [
    {
      provider: 'github',
      owner: 'neovateai',
      repo: 'neovate-code-desktop',
    },
  ],

  asar: true,

  // Native modules must be unpacked from asar to work correctly
  asarUnpack: getAsarUnpackPatterns(),

  files: [
    'dist/**/*',
    // Include all node_modules (electron-builder will automatically prune devDependencies)
    'node_modules/**/*',
    'assets/extensions/**/*',
  ],

  compression: 'maximum',

  mac: {
    icon: isDev ? 'build/icons/icon-dev.icns' : 'build/icons/icon.icns',
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    target: [
      {
        target: 'dmg',
        arch: ['arm64', 'x64'],
      },
      {
        target: 'zip',
        arch: ['arm64', 'x64'],
      },
    ],
    // Code signing: controlled by CSC_LINK env var
    identity: process.env.CSC_LINK ? 'chen cheng (KU8S35TEW8)' : null,
    // Notarization: only when Apple credentials are available
    notarize: !!(
      process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD
    ),
  },
  linux: {
    icon: 'build/icons',
    category: 'Development',
    target: ['AppImage', 'deb', 'rpm'],
  },

  // Remove unused Electron Framework localizations (~30MB saved)
  afterPack: async (context) => {
    if (!['darwin', 'mas'].includes(context.electronPlatformName)) return;

    const resourcePath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents/Frameworks/Electron Framework.framework/Versions/A/Resources',
    );

    try {
      const entries = await fs.readdir(resourcePath);
      const kept = [];
      let removed = 0;

      for (const file of entries.filter((f) => f.endsWith('.lproj'))) {
        const lang = file.replace('.lproj', '');
        if (keepLanguages.has(lang)) {
          kept.push(lang);
        } else {
          await fs.rm(path.join(resourcePath, file), {
            force: true,
            recursive: true,
          });
          removed++;
        }
      }

      console.log(
        `\nKept ${kept.join(', ')}, removed ${removed} language packs\n`,
      );
    } catch (error) {
      console.warn('Failed to clean up language packs:', error.message);
    }
  },
};

export default config;
