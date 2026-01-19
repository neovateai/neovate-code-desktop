import baseConfig from './electron-builder.mjs';

/**
 * @type {import('electron-builder').Configuration}
 */
const devConfig = {
  ...baseConfig,
  artifactName: 'neovate-dev-${arch}.${ext}',
  directories: {
    output: 'release-dev',
  },
  // Development-specific overrides
  compression: 'store', // Faster builds
  mac: {
    ...baseConfig.mac,
    // Sign with ad-hoc identity for faster dev builds
    identity: null,
    // Skip notarization for dev builds
    notarize: false,
  },
};

export default devConfig;
