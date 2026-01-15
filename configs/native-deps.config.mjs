/**
 * Native dependencies configuration for Electron Builder
 * 
 * This file manages dependencies required by the main process:
 * - Native modules (with C/C++ bindings) must be extracted from asar
 * - Runtime dependencies must be included in the package
 */

/**
 * Native modules that need to be unpacked from asar
 * These modules contain .node files that cannot be loaded from asar
 */
const nativeModules = [
  '@neovate/code',
  'node-pty',
];

/**
 * Runtime dependencies required by the main process
 * These are regular npm packages (not native) but are needed at runtime
 */
const runtimeDependencies = [
  'electron-updater',
  'portfinder',
  '@electron-toolkit/preload',
  '@electron-toolkit/utils',
];

/**
 * All dependencies that need to be included in the package
 */
const allDependencies = [...nativeModules, ...runtimeDependencies];

/**
 * Generate asarUnpack patterns for electron-builder
 * @returns {string[]} Array of glob patterns for asarUnpack
 */
export function getAsarUnpackPatterns() {
  // Only native modules need to be unpacked
  return nativeModules.map((mod) => `**/node_modules/${mod}/**/*`);
}

/**
 * Generate files patterns for electron-builder
 * When excluding node_modules, these patterns ensure required dependencies are still included
 * @returns {string[]} Array of glob patterns for files
 */
export function getFilesPatterns() {
  // All dependencies (native + runtime) need to be included
  return allDependencies.map((mod) => `node_modules/${mod}/**/*`);
}
