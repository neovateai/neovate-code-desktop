import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { getAsarUnpackPatterns } from './native-deps.config.mjs';

const isDev = process.env.BUILD_ENV === 'dev';
const localUpdateServer =
  process.env.LOCAL_UPDATE_SERVER || 'http://localhost:8080';
const localUpdateSignIdentity =
  process.env.LOCAL_UPDATE_SIGN_IDENTITY || 'Neovate Local Code Sign';
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);
const execFileAsync = promisify(execFile);

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

  publish: [{ provider: 'generic', url: localUpdateServer }],

  asar: true,

  // Native modules must be unpacked from asar to work correctly
  asarUnpack: getAsarUnpackPatterns(),

  files: [
    'dist/**/*',
    // Include all node_modules (electron-builder will automatically prune devDependencies)
    'node_modules/**/*',
    'assets/extensions/**/*',
  ],

  compression: 'store',

  mac: {
    icon: isDev ? 'build/icons/icon-dev.icns' : 'build/icons/icon.icns',
    category: 'public.app-category.developer-tools',
    hardenedRuntime: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    target: [
      {
        target: 'dmg',
        arch: ['arm64'],
      },
      {
        target: 'zip',
        arch: ['arm64'],
      },
    ],
    identity: null,
    notarize: false,
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

    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
    );
    try {
      // Ensure deterministic signing for Squirrel.Mac local update testing.
      await execFileAsync('codesign', [
        '--force',
        '--deep',
        '--sign',
        localUpdateSignIdentity,
        appPath,
      ]);
      console.log('\nCodesign completed for local update testing\n');
    } catch (error) {
      console.error('Codesign failed:', error.message);
      throw error;
    }
  },
};

export default config;
