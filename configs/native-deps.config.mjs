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
const nativeModules = ['@neovate/code', 'node-pty'];

/**
 * Generate asarUnpack patterns for electron-builder
 * @returns {string[]} Array of glob patterns for asarUnpack
 */
export function getAsarUnpackPatterns() {
  // Only native modules need to be unpacked
  return nativeModules.map((mod) => `**/node_modules/${mod}/**/*`);
}
