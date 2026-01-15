import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAsarUnpackPatterns, getFilesPatterns } from './native-deps.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keep only these Electron Framework localization folders (*.lproj)
// Reduces app size by ~30MB on macOS
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration
 */
const config = {
  appId: 'com.neovateai.desktop',
  productName: 'Neovate',
  
  directories: {
    output: 'release',
  },
  
  artifactName: 'neovate-${version}-${arch}.${ext}',
  
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
  ],
  
  mac: {
    icon: 'build/icons/icon.icns',
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
    // Optimize compression
    compression: 'maximum',
  },
  
  /**
   * AfterPack hook to remove unused Electron Framework localizations
   * This reduces the app size by ~30MB on macOS
   * 
   * Background:
   * - Electron Framework includes 34+ language packs (*.lproj)
   * - Each pack is ~1MB, totaling ~34MB
   * - We use our own i18n system, so these are unnecessary
   * - At least one language must remain to prevent app crashes
   */
  afterPack: async (context) => {
    // Only process macOS builds
    if (!['darwin', 'mas'].includes(context.electronPlatformName)) {
      return;
    }

    // Path to Electron Framework resources
    // Example: Neovate.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/*.lproj
    const frameworkResourcePath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Frameworks',
      'Electron Framework.framework',
      'Versions',
      'A',
      'Resources',
    );

    try {
      const entries = await fs.readdir(frameworkResourcePath);
      
      let removedCount = 0;
      
      await Promise.all(
        entries.map(async (file) => {
          if (!file.endsWith('.lproj')) return;

          const lang = file.split('.')[0];
          
          // Keep only English variants
          if (keepLanguages.has(lang)) {
            console.log(`✅ Keeping language: ${file}`);
            return;
          }

          const fullPath = path.join(frameworkResourcePath, file);
          await fs.rm(fullPath, { force: true, recursive: true });
          removedCount++;
          console.log(`🗑️  Removed language: ${file}`);
        }),
      );
      
      console.log(`\n✨ Removed ${removedCount} language packs, saved ~${Math.round(removedCount * 1)}MB\n`);
    } catch (error) {
      // Non-critical: folder may not exist depending on packaging details
      console.warn('⚠️  Failed to clean up language packs:', error.message);
    }
  },
};

export default config;
